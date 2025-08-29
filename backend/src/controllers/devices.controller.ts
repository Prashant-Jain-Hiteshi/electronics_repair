import { Request, Response } from 'express'
import { body, param, validationResult } from 'express-validator'
import { AuthRequest } from '../middleware/auth'
import { Customer, CustomerDevice, RepairOrder } from '../models'

export const deviceValidators = {
  create: [
    body('deviceType').isString().trim().notEmpty(),
    body('brand').isString().trim().notEmpty(),
    body('model').isString().trim().notEmpty(),
    body('serialNumber').optional().isString(),
    body('notes').optional().isString(),
  ],
  update: [
    param('id').isString(),
    body('deviceType').optional().isString().trim().notEmpty(),
    body('brand').optional().isString().trim().notEmpty(),
    body('model').optional().isString().trim().notEmpty(),
    body('serialNumber').optional().isString(),
    body('notes').optional().isString(),
  ],
  link: [param('id').isString(), param('repairId').isString()],
  history: [param('id').isString()],
}

export async function createDevice(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.mapped() })

    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
    const { deviceType, brand, model, serialNumber, notes } = req.body
    const dev = await CustomerDevice.create({
      customerId: (cust as any).id,
      deviceType,
      brand,
      model,
      serialNumber: serialNumber || null,
      notes: notes || null,
    })
    return res.status(201).json({ device: dev })
  } catch (err) {
    console.error('createDevice error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function listMyDevices(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
    const devices = await CustomerDevice.findAll({ where: { customerId: (cust as any).id } as any, order: [['createdAt', 'DESC']] })
    return res.status(200).json({ devices })
  } catch (err) {
    console.error('listMyDevices error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function updateDevice(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.mapped() })

    const { id } = req.params
    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
    const dev = await CustomerDevice.findByPk(id)
    if (!dev) return res.status(404).json({ message: 'Device not found' })
    if ((dev as any).customerId !== (cust as any).id) return res.status(403).json({ message: 'Forbidden' })

    const { deviceType, brand, model, serialNumber, notes } = req.body
    if (deviceType) (dev as any).deviceType = deviceType
    if (brand) (dev as any).brand = brand
    if (model) (dev as any).model = model
    if (serialNumber !== undefined) (dev as any).serialNumber = serialNumber || null
    if (notes !== undefined) (dev as any).notes = notes || null

    await (dev as any).save()
    return res.status(200).json({ device: dev })
  } catch (err) {
    console.error('updateDevice error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function linkDeviceToRepair(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.mapped() })

    const { id, repairId } = req.params
    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })

    const dev = await CustomerDevice.findByPk(id)
    if (!dev) return res.status(404).json({ message: 'Device not found' })
    if ((dev as any).customerId !== (cust as any).id) return res.status(403).json({ message: 'Forbidden' })

    const repair = await RepairOrder.findByPk(repairId)
    if (!repair) return res.status(404).json({ message: 'Repair order not found' })
    if ((repair as any).customerId !== (cust as any).id) return res.status(403).json({ message: 'Forbidden' })

    ;(repair as any).customerDeviceId = (dev as any).id
    await (repair as any).save()

    return res.status(200).json({ repair })
  } catch (err) {
    console.error('linkDeviceToRepair error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function getDeviceHistory(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.mapped() })

    const { id } = req.params
    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
    const dev = await CustomerDevice.findByPk(id)
    if (!dev) return res.status(404).json({ message: 'Device not found' })
    if ((dev as any).customerId !== (cust as any).id) return res.status(403).json({ message: 'Forbidden' })

    let repairs: any[] = []
    try {
      repairs = await (RepairOrder as any).findAll({
        where: { customerDeviceId: id } as any,
        attributes: [
          'id',
          'status',
          'deviceType',
          'brand',
          'model',
          'serialNumber',
          'createdAt',
        ],
        order: [['createdAt', 'DESC']] as any,
      })
    } catch (e) {
      console.warn('customerDeviceId filter failed; falling back to customer/device fields match:', (e as any)?.message)
      // Fallback for older DBs without customerDeviceId column: approximate by matching device fields and same customer
      repairs = await (RepairOrder as any).findAll({
        where: {
          customerId: (cust as any).id,
          deviceType: (dev as any).deviceType,
          brand: (dev as any).brand,
          model: (dev as any).model,
        } as any,
        attributes: [
          'id',
          'status',
          'deviceType',
          'brand',
          'model',
          'serialNumber',
          'createdAt',
        ],
        order: [['createdAt', 'DESC']] as any,
      })
    }

    const history = repairs.map((r: any) => ({
      id: r.id,
      status: r.status,
      deviceType: r.deviceType,
      brand: r.brand,
      model: r.model,
      serialNumber: r.serialNumber,
      createdAt: r.createdAt,
      invoiceUrl: `/api/repairs/${r.id}/invoice`,
    }))

    return res.status(200).json({ device: dev, repairs: history })
  } catch (err) {
    console.error('getDeviceHistory error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
