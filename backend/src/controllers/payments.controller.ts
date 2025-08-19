import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import Payment from '../models/Payment';
import Customer from '../models/Customer';
import RepairOrder from '../models/RepairOrder';
import sequelize from '../config/database';
import { Request } from 'express';
import { PaymentMethod, PaymentStatus } from '../models/Payment';

// Payments for a specific repair order
export async function listPaymentsForRepair(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params; // repairOrderId
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });

    const order = await RepairOrder.findByPk(id);
    if (!order) return res.status(404).json({ message: 'Repair order not found' });

    // If customer, ensure ownership
    if ((req.user as any).role === 'customer') {
      const customer = await Customer.findOne({ where: { userId: req.user.id } });
      if (!customer || (order as any).customerId !== (customer as any).id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const payments = await Payment.findAll({ where: { repairOrderId: id } });
    return res.status(200).json({ payments });
  } catch (err) {
    console.error('List repair payments error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin: view all payments
export async function listAllPayments(_req: AuthRequest, res: Response) {
  try {
    const payments = await Payment.findAll();
    return res.status(200).json({ payments });
  } catch (err) {
    console.error('List payments error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Customer: view own payments
export async function listMyPayments(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    const customer = await Customer.findOne({ where: { userId: req.user.id } });
    if (!customer) return res.status(404).json({ message: 'Customer profile not found' });
    const orders = await RepairOrder.findAll({ where: { customerId: customer.id } });
    const orderIds = orders.map((o) => o.id);
    const payments = await Payment.findAll({ where: { repairOrderId: { [Op.in]: orderIds } } });
    return res.status(200).json({ payments });
  } catch (err) {
    console.error('List my payments error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Technician: limited view - payments for their assigned repair orders
export async function listTechnicianPayments(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    const orders = await RepairOrder.findAll({ where: { technicianId: req.user.id } });
    const orderIds = orders.map((o) => o.id);
    const payments = await Payment.findAll({ where: { repairOrderId: { [Op.in]: orderIds } } });
    return res.status(200).json({ payments });
  } catch (err) {
    console.error('List technician payments error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Create/record a payment for a repair order
export async function createPayment(req: Request, res: Response) {
  const t = await sequelize.transaction();
  try {
    const { repairOrderId, amount, method, transactionId, paidAt, notes } = req.body || {};
    if (!repairOrderId || amount == null || !method) {
      return res.status(400).json({ message: 'repairOrderId, amount, method are required' });
    }

    // Validate repair order exists
    const order = await RepairOrder.findByPk(repairOrderId, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Repair order not found' });
    }

    // If caller is a customer, enforce ownership of the repair order
    const reqAny = req as any;
    if (reqAny.user?.role === 'customer' && reqAny.user?.id) {
      const customer = await Customer.findOne({ where: { userId: reqAny.user.id }, transaction: t });
      if (!customer || (order as any).customerId !== (customer as any).id) {
        await t.rollback();
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    // Validate method value
    const allowedMethods = Object.values(PaymentMethod);
    if (!allowedMethods.includes(method)) {
      await t.rollback();
      return res.status(400).json({ message: `method must be one of: ${allowedMethods.join(', ')}` });
    }

    const payment = await Payment.create(
      {
        repairOrderId,
        amount,
        method,
        status: PaymentStatus.COMPLETED,
        transactionId: transactionId || null,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        notes: notes || null,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({ payment });
  } catch (err) {
    await t.rollback();
    console.error('Create payment error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
