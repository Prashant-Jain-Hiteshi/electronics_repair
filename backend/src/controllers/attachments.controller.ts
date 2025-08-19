import { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { RepairOrder, Customer, RepairAttachment } from '../models'

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

export async function listAttachments(req: Request, res: Response) {
  try {
    const { id } = req.params // repairOrderId
    const repair = await RepairOrder.findByPk(id)
    if (!repair) return res.status(404).json({ message: 'Repair order not found' })

    // If customer, ensure ownership
    const anyReq: any = req
    if (anyReq.user?.role === 'customer' && anyReq.user?.id) {
      const [cust] = await Customer.findOrCreate({ where: { userId: anyReq.user.id }, defaults: { userId: anyReq.user.id } })
      if (repair.customerId !== cust.id) return res.status(403).json({ message: 'Forbidden' })
    }

    const items = await RepairAttachment.findAll({ where: { repairOrderId: id }, order: [['createdAt', 'ASC']] })
    const base = `${req.protocol}://${req.get('host')}`
    const attachments = items.map((a: any) => ({
      id: a.id,
      repairOrderId: a.repairOrderId,
      url: `${base}/uploads/repairs/${a.repairOrderId}/${a.filename}`,
      originalName: a.originalName,
      mimeType: a.mimeType,
      size: a.size,
      uploadedByUserId: a.uploadedByUserId,
      createdAt: a.createdAt,
    }))
    return res.status(200).json({ attachments })
  } catch (err) {
    console.error('List attachments error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function uploadAttachments(req: Request, res: Response) {
  try {
    const { id } = req.params // repairOrderId
    const repair = await RepairOrder.findByPk(id)
    if (!repair) return res.status(404).json({ message: 'Repair order not found' })

    const anyReq: any = req
    if (anyReq.user?.role === 'customer' && anyReq.user?.id) {
      const [cust] = await Customer.findOrCreate({ where: { userId: anyReq.user.id }, defaults: { userId: anyReq.user.id } })
      if (repair.customerId !== cust.id) return res.status(403).json({ message: 'Forbidden' })
    }

    const files = (req as any).files as Express.Multer.File[] | undefined
    if (!files || files.length === 0) return res.status(400).json({ message: 'At least 1 image is required' })
    if (files.length > 3) return res.status(400).json({ message: 'Maximum 3 images allowed' })

    const created: any[] = []
    for (const f of files) {
      const relDir = path.join('uploads', 'repairs', id)
      ensureDir(relDir)
      // multer already saved into correct dir via storage
      const att = await RepairAttachment.create({
        repairOrderId: id,
        filename: f.filename,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        uploadedByUserId: anyReq.user?.id,
      })
      created.push(att)
    }
    return res.status(201).json({ count: created.length })
  } catch (err) {
    console.error('Upload attachments error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function deleteAttachment(req: Request, res: Response) {
  try {
    const { id, attachmentId } = req.params
    const att = await RepairAttachment.findByPk(attachmentId)
    if (!att || att.repairOrderId !== id) return res.status(404).json({ message: 'Attachment not found' })

    const repair = await RepairOrder.findByPk(id)
    if (!repair) return res.status(404).json({ message: 'Repair order not found' })

    const anyReq: any = req
    // Allow: admin/technician, or uploader
    if (!(anyReq.user?.role === 'admin' || anyReq.user?.role === 'technician' || anyReq.user?.id === att.uploadedByUserId)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    // Remove file
    const filePath = path.join('uploads', 'repairs', id, att.filename)
    try { fs.unlinkSync(filePath) } catch {}

    await att.destroy()
    return res.status(204).send()
  } catch (err) {
    console.error('Delete attachment error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
