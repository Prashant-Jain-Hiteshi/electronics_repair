import { Request, Response } from 'express'
import { ApprovalRequest, Customer, RepairOrder, User } from '../models'
import { ApprovalStatus, ApprovalType } from '../models/ApprovalRequest'
import { notifySmart } from '../services/notifications.service'
import { signApprovalToken, verifyApprovalToken } from '../utils/approvalToken'

function getNowPlus(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export const createApprovalRequest = async (req: Request, res: Response) => {
  try {
    const { repairOrderId } = req.params as any
    const { type, title, message, items, amountDelta, expiresInDays } = req.body as {
      type: ApprovalType
      title?: string
      message?: string
      items?: any
      amountDelta?: number
      expiresInDays?: number
    }

    const ro = await RepairOrder.findByPk(repairOrderId)
    if (!ro) return res.status(404).json({ message: 'Repair order not found' })

    const customer = await Customer.findByPk(ro.customerId)
    if (!customer) return res.status(400).json({ message: 'Customer not found for repair' })

    const token = signApprovalToken({ approvalId: 'pending', repairOrderId: ro.id, customerId: customer.id }, `${expiresInDays || 7}d`)

    const approval = await ApprovalRequest.create({
      repairOrderId: ro.id,
      customerId: customer.id,
      type,
      title: title || (type === 'estimate' ? 'Estimate Approval' : 'Additional Parts Approval'),
      message: message || null,
      items: items || null,
      amountDelta: amountDelta ?? null,
      status: ApprovalStatus.PENDING,
      token: token,
      tokenExpiresAt: getNowPlus(expiresInDays || 7),
    })

    // Re-sign with real approvalId for consistency in links
    approval.token = signApprovalToken({ approvalId: approval.id, repairOrderId: ro.id, customerId: customer.id }, `${expiresInDays || 7}d`)
    await approval.save()

    // Notify customer (in-app + email/SMS) via their user account
    const custUser = await User.findByPk(customer.userId)
    if (custUser) {
      await notifySmart({
        userId: custUser.id,
        event: 'approval:created',
        data: { approvalId: approval.id, repairOrderId: ro.id, type: approval.type, title: approval.title, amountDelta: approval.amountDelta },
        channels: ['in_app', 'email', 'sms'],
      })
    }

    res.status(201).json(approval)
  } catch (err) {
    console.error('createApprovalRequest error', err)
    res.status(500).json({ message: 'Failed to create approval request' })
  }
}

export const listApprovalsForRepair = async (req: Request, res: Response) => {
  try {
    const { repairOrderId } = req.params as any
    const approvals = await ApprovalRequest.findAll({ where: { repairOrderId }, order: [['createdAt', 'DESC']] })
    res.json(approvals)
  } catch (err) {
    console.error('listApprovalsForRepair error', err)
    res.status(500).json({ message: 'Failed to load approvals' })
  }
}

export const getApprovalStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as any
    const approval = await ApprovalRequest.findByPk(id)
    if (!approval) return res.status(404).json({ message: 'Approval not found' })
    res.json({ id: approval.id, status: approval.status })
  } catch (err) {
    console.error('getApprovalStatus error', err)
    res.status(500).json({ message: 'Failed to load approval status' })
  }
}

export const actOnApproval = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as any
    const { action } = req.body as { action: 'approve' | 'reject' }

    const approval = await ApprovalRequest.findByPk(id)
    if (!approval) return res.status(404).json({ message: 'Approval not found' })
    if (approval.status !== ApprovalStatus.PENDING) return res.status(400).json({ message: 'Approval already finalized' })

    approval.status = action === 'approve' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED
    await approval.save()

    const customer = await Customer.findByPk(approval.customerId)
    const custUser = customer ? await User.findByPk(customer.userId) : null
    if (custUser) {
      await notifySmart({ userId: custUser.id, event: 'approval:updated', data: { id: approval.id, status: approval.status, repairOrderId: approval.repairOrderId }, channels: ['in_app', 'email', 'sms'] })
    }

    res.json(approval)
  } catch (err) {
    console.error('actOnApproval error', err)
    res.status(500).json({ message: 'Failed to update approval' })
  }
}

export const publicActOnApproval = async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token: string; action: 'approve' | 'reject' }
    if (!token) return res.status(400).json({ message: 'Missing token' })

    const payload = verifyApprovalToken(token)
    if (!payload) return res.status(401).json({ message: 'Invalid or expired token' })

    const approval = await ApprovalRequest.findByPk(payload.approvalId)
    if (!approval) return res.status(404).json({ message: 'Approval not found' })
    if (approval.status !== ApprovalStatus.PENDING) return res.status(400).json({ message: 'Approval already finalized' })

    const { action } = req.body as { token: string; action: 'approve' | 'reject' }
    approval.status = action === 'approve' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED
    await approval.save()

    const customer = await Customer.findByPk(approval.customerId)
    const custUser = customer ? await User.findByPk(customer.userId) : null
    if (custUser) {
      await notifySmart({ userId: custUser.id, event: 'approval:updated', data: { id: approval.id, status: approval.status, repairOrderId: approval.repairOrderId }, channels: ['in_app', 'email', 'sms'] })
    }

    res.json({ ok: true, id: approval.id, status: approval.status })
  } catch (err) {
    console.error('publicActOnApproval error', err)
    res.status(500).json({ message: 'Failed to process approval' })
  }
}
