import { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import Estimate, { EstimateStatus } from '../models/Estimate';
import Customer from '../models/Customer';
import RepairOrder, { RepairStatus, Priority } from '../models/RepairOrder';

// List estimates (admin)
export async function listEstimates(req: Request, res: Response) {
  try {
    const { q, status, customerId, repairOrderId } = (req.query || {}) as Record<string, string | undefined>;
    const where: any = {};
    if (status && Object.values(EstimateStatus).includes(status as EstimateStatus)) where.status = status;
    if (customerId) where.customerId = customerId;
    if (repairOrderId) where.repairOrderId = repairOrderId;
    if (q && q.trim()) {
      const s = `%${q.trim()}%`;
      where[Op.or] = [
        { id: q.trim() },
        { brand: { [Op.iLike as any]: s } },
        { model: { [Op.iLike as any]: s } },
        { deviceType: { [Op.iLike as any]: s } },
        { notes: { [Op.iLike as any]: s } },
      ];
    }
    const estimates = await Estimate.findAll({ where, order: [['createdAt', 'DESC']] as any });
    return res.status(200).json({ estimates });
  } catch (err) {
    console.error('List estimates error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Get single estimate
export async function getEstimate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const estimate = await Estimate.findByPk(id);
    if (!estimate) return res.status(404).json({ message: 'Estimate not found' });
    const customer = await Customer.findByPk((estimate as any).customerId);
    return res.status(200).json({ estimate, customer });
  } catch (err) {
    console.error('Get estimate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Create estimate
export async function createEstimate(req: Request, res: Response) {
  const t = await sequelize.transaction();
  try {
    const body = req.body || {};
    const required = ['customerId', 'deviceType', 'brand', 'model'];
    for (const k of required) if (!body[k]) { await t.rollback(); return res.status(400).json({ message: `${k} is required` }); }

    const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
    const subtotal = Number(body.subtotal ?? 0);
    const tax = Number(body.tax ?? 0);
    const discount = Number(body.discount ?? 0);
    const total = Number(body.total ?? (subtotal + tax - discount));

    const payload: any = {
      customerId: body.customerId,
      deviceType: body.deviceType,
      brand: body.brand,
      model: body.model,
      issueDescription: body.issueDescription ?? null,
      notes: body.notes ?? null,
      status: (body.status && Object.values(EstimateStatus).includes(body.status)) ? body.status : EstimateStatus.SENT,
      lineItems,
      subtotal,
      tax,
      discount,
      total,
      validityUntil: body.validityUntil ? new Date(body.validityUntil) : null,
      attachments: body.attachments ?? null,
    };

    const estimate = await Estimate.create(payload, { transaction: t });
    await t.commit();
    return res.status(201).json({ estimate });
  } catch (err) {
    await t.rollback();
    console.error('Create estimate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Approve and convert to Repair Order
export async function approveEstimate(req: Request, res: Response) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const estimate = await Estimate.findByPk(id, { transaction: t });
    if (!estimate) { await t.rollback(); return res.status(404).json({ message: 'Estimate not found' }); }
    if (estimate.status === EstimateStatus.REJECTED) { await t.rollback(); return res.status(400).json({ message: 'Rejected estimate cannot be approved' }); }

    // Create RepairOrder if not yet linked
    let repair: RepairOrder | null = null;
    if (!estimate.repairOrderId) {
      repair = await RepairOrder.create({
        customerId: estimate.customerId,
        deviceType: estimate.deviceType,
        brand: estimate.brand,
        model: estimate.model,
        issueDescription: estimate.issueDescription ?? 'Approved estimate',
        status: RepairStatus.PENDING,
        priority: Priority.MEDIUM,
        estimatedCost: Number(estimate.total || 0),
      } as any, { transaction: t });
      estimate.repairOrderId = (repair as any).id;
    }

    estimate.status = EstimateStatus.APPROVED;
    await estimate.save({ transaction: t });
    await t.commit();
    return res.status(200).json({ estimate, repairOrderId: estimate.repairOrderId });
  } catch (err) {
    await t.rollback();
    console.error('Approve estimate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Reject estimate
export async function rejectEstimate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const estimate = await Estimate.findByPk(id);
    if (!estimate) return res.status(404).json({ message: 'Estimate not found' });
    estimate.status = EstimateStatus.REJECTED;
    await estimate.save();
    return res.status(200).json({ estimate });
  } catch (err) {
    console.error('Reject estimate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
