import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { AuthRequest } from '../middleware/auth'
import { Customer, Feedback, RepairOrder, User } from '../models'

const LOW_RATING_THRESHOLD = 2 // 1-5 stars; alert when <= threshold

export const feedbackValidators = {
  submit: [
    body('repairOrderId').isString().notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comments').optional().isString(),
    body('npsScore').optional().isInt({ min: 0, max: 10 }),
  ],
}

export async function submitFeedback(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.mapped() })

    const { repairOrderId, rating, comments, npsScore } = req.body

    const repair = await RepairOrder.findByPk(repairOrderId)
    if (!repair) return res.status(404).json({ message: 'Repair order not found' })

    // Only the owner customer can submit feedback
    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
    if ((repair as any).customerId !== (cust as any).id) return res.status(403).json({ message: 'Forbidden' })

    // Optionally enforce one feedback per repair: upsert by (repairOrderId, customerId)
    const existing = await Feedback.findOne({ where: { repairOrderId, customerId: (cust as any).id } as any })
    const payload: any = {
      repairOrderId,
      customerId: (cust as any).id,
      technicianId: (repair as any).technicianId || null,
      rating: Number(rating),
      comments: comments || null,
      npsScore: typeof npsScore === 'number' ? npsScore : (npsScore ? Number(npsScore) : null),
    }

    let fb: any
    if (existing) {
      existing.rating = payload.rating
      existing.comments = payload.comments
      existing.npsScore = payload.npsScore
      // reset notified flag if updated to low
      if (payload.rating <= LOW_RATING_THRESHOLD) existing.notifiedLowRating = false
      fb = await existing.save()
    } else {
      fb = await Feedback.create(payload)
    }

    return res.status(201).json({ feedback: fb })
  } catch (err) {
    console.error('Submit feedback error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function listMyFeedback(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
    const items = await Feedback.findAll({ where: { customerId: (cust as any).id } as any, order: [['createdAt', 'DESC']] })
    return res.status(200).json({ feedback: items })
  } catch (err) {
    console.error('List my feedback error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function getFeedbackForRepair(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const { repairId } = req.params
    const repair = await RepairOrder.findByPk(repairId)
    if (!repair) return res.status(404).json({ message: 'Repair order not found' })

    // Customer: only own repair; Admin/Tech: allowed via role middleware on route
    if ((req.user as any).role === 'customer') {
      const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } })
      if ((repair as any).customerId !== (cust as any).id) return res.status(403).json({ message: 'Forbidden' })
    }

    const items = await Feedback.findAll({ where: { repairOrderId: repairId } as any, order: [['createdAt', 'DESC']] })
    return res.status(200).json({ feedback: items })
  } catch (err) {
    console.error('Get feedback for repair error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
