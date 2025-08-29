import { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { AuthRequest } from '../middleware/auth'
import { RepairOrder, Customer, Warranty, RmaTicket, User } from '../models'
import { WarrantyStatus } from '../models/Warranty'
import { RmaStatus } from '../models/RmaTicket'
import { emitToRole, emitToUser } from '../socket'

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

export async function validateWarranty(req: AuthRequest, res: Response) {
  try {
    const { repairId } = req.params
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })

    const repair = await RepairOrder.findByPk(repairId)
    if (!repair) return res.status(404).json({ message: 'Repair order not found' })

    // Customer can only validate their own repair
    if ((req.user as any).role === 'customer') {
      const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
      if ((repair as any).customerId !== (cust as any).id) return res.status(403).json({ message: 'Forbidden' })
    }

    // Find or derive warranty
    let w = await Warranty.findOne({ where: { repairOrderId: repairId } as any })
    const periodDays = Number((repair as any).warrantyPeriod || 0)
    const startAt = (repair as any).actualCompletionDate ? new Date((repair as any).actualCompletionDate) : (repair as any).updatedAt
    if (!w) {
      if (!periodDays || !startAt) {
        return res.status(200).json({ valid: false, warranty: null })
      }
      const endAt = new Date(startAt)
      endAt.setDate(endAt.getDate() + periodDays)
      w = await Warranty.create({
        repairOrderId: repairId,
        customerId: (repair as any).customerId,
        startAt,
        endAt,
        periodDays,
        status: endAt >= new Date() ? WarrantyStatus.ACTIVE : WarrantyStatus.EXPIRED,
      } as any)
    }

    const now = new Date()
    const valid = (w as any).endAt >= now && (w as any).status === WarrantyStatus.ACTIVE
    // Auto-expire if past end date
    if (!valid && (w as any).status !== WarrantyStatus.EXPIRED) {
      ;(w as any).status = WarrantyStatus.EXPIRED
      await w.save()
    }

    return res.status(200).json({
      valid,
      warranty: {
        id: (w as any).id,
        startAt: (w as any).startAt,
        endAt: (w as any).endAt,
        periodDays: (w as any).periodDays,
        status: (w as any).status,
      },
    })
  } catch (err) {
    console.error('Validate warranty error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function createRma(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const { repairOrderId, reason, description } = req.body || {}
    if (!repairOrderId) return res.status(400).json({ message: 'repairOrderId is required' })

    const repair = await RepairOrder.findByPk(repairOrderId)
    if (!repair) return res.status(404).json({ message: 'Repair order not found' })

    // Customer ownership enforcement
    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
    if ((repair as any).customerId !== (cust as any).id) return res.status(403).json({ message: 'Forbidden' })

    // Validate warranty
    const existingW = await Warranty.findOne({ where: { repairOrderId } as any })
    let warrantyId: string | null = null
    let isValid = false
    if (existingW) {
      const now = new Date()
      isValid = (existingW as any).endAt >= now && (existingW as any).status === WarrantyStatus.ACTIVE
      warrantyId = (existingW as any).id
    } else {
      // derive using repair fields
      const periodDays = Number((repair as any).warrantyPeriod || 0)
      const startAt = (repair as any).actualCompletionDate ? new Date((repair as any).actualCompletionDate) : (repair as any).updatedAt
      if (periodDays && startAt) {
        const endAt = new Date(startAt)
        endAt.setDate(endAt.getDate() + periodDays)
        isValid = endAt >= new Date()
        const w = await Warranty.create({
          repairOrderId,
          customerId: (repair as any).customerId,
          startAt,
          endAt,
          periodDays,
          status: isValid ? WarrantyStatus.ACTIVE : WarrantyStatus.EXPIRED,
        } as any)
        warrantyId = (w as any).id
      }
    }

    if (!isValid) return res.status(400).json({ message: 'Warranty not valid or expired' })

    // Create RMA
    const rma = await RmaTicket.create({
      repairOrderId,
      customerId: (repair as any).customerId,
      warrantyId,
      reason: reason || null,
      description: description || null,
      status: RmaStatus.REQUESTED,
    } as any)

    // Move uploaded files into uploads/rma/:id and store metadata
    const files = ((req as any).files as Express.Multer.File[] | undefined) || []
    const relDir = path.join('uploads', 'rma', (rma as any).id)
    ensureDir(relDir)
    const atts: any[] = []
    for (const f of files) {
      try {
        let ext = path.extname(f.originalname) || ''
        if (!ext) {
          if (/jpeg|jpg/i.test(f.mimetype)) ext = '.jpg'
          else if (/png/i.test(f.mimetype)) ext = '.png'
          else if (/webp/i.test(f.mimetype)) ext = '.webp'
        }
        const newName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
        const targetPath = path.join(relDir, newName)
        fs.renameSync(f.path, targetPath)
        atts.push({ filename: newName, originalName: f.originalname, mimeType: f.mimetype, size: f.size })
      } catch (e) {
        console.warn('RMA: failed to persist uploaded file', (e as any)?.message || e)
      }
    }
    if (atts.length > 0) {
      ;(rma as any).attachments = atts
      await rma.save()
    }

    // Notify customer and admins
    try {
      const userId = req.user.id
      emitToUser(userId, 'notification:new', {
        kind: 'rma_requested',
        rmaId: (rma as any).id,
        repairId: repairOrderId,
        title: 'Warranty service requested',
        createdAt: new Date().toISOString(),
      })
      emitToRole('admin', 'admin:notification:new', {
        kind: 'rma_requested', rmaId: (rma as any).id, repairId: repairOrderId, title: 'New RMA ticket'
      })
    } catch {}

    return res.status(201).json({ rma })
  } catch (err) {
    console.error('Create RMA error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function listMyRmas(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
    const items = await RmaTicket.findAll({ where: { customerId: (cust as any).id } as any, order: [['createdAt', 'DESC']] })
    return res.status(200).json({ rmas: items })
  } catch (err) {
    console.error('List RMAs error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function getRmaById(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const { id } = req.params
    const rma = await RmaTicket.findByPk(id)
    if (!rma) return res.status(404).json({ message: 'RMA not found' })

    // Customer can only view own
    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
    if ((rma as any).customerId !== (cust as any).id && (req.user as any).role === 'customer') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    return res.status(200).json({ rma })
  } catch (err) {
    console.error('Get RMA error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
