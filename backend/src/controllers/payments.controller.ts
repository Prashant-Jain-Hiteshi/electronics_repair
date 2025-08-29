import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import Payment, { PaymentKind, PaymentProvider, PaymentStatus } from '../models/Payment';
import Customer from '../models/Customer';
import RepairOrder from '../models/RepairOrder';
import sequelize from '../config/database';
import { Request } from 'express';
import { PaymentMethod } from '../models/Payment';
import RepairPart from '../models/RepairPart';
import Inventory from '../models/Inventory';
import TaxProfile from '../models/TaxProfile';
import Location from '../models/Location';
import { logAudit } from '../utils/audit';

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

// Create Payment Intent (generates a link for UPI/Stripe; stores pending Payment)
export async function createPaymentIntent(req: AuthRequest, res: Response) {
  const t = await sequelize.transaction();
  try {
    const { repairOrderId, amount, method, provider, kind, currencyCode } = (req.body || {}) as any;
    if (!repairOrderId || amount == null || !method) {
      await t.rollback();
      return res.status(400).json({ message: 'repairOrderId, amount, method are required' });
    }
    const order = await RepairOrder.findByPk(repairOrderId, { transaction: t });
    if (!order) { await t.rollback(); return res.status(404).json({ message: 'Repair order not found' }); }

    // Access control for customers
    if (req.user?.role === 'customer' && req.user?.id) {
      const customer = await Customer.findOne({ where: { userId: req.user.id }, transaction: t });
      if (!customer || (order as any).customerId !== (customer as any).id) {
        await t.rollback();
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const prov: PaymentProvider = provider && Object.values(PaymentProvider).includes(provider) ? provider : PaymentProvider.MANUAL;
    const kd: PaymentKind | undefined = kind && Object.values(PaymentKind).includes(kind) ? kind : undefined;

    // Generate a fake intent/link in lieu of real gateway; client can redirect
    const intentId = `pi_${Math.random().toString(36).slice(2)}`;
    const linkUrl = prov === PaymentProvider.STRIPE
      ? `https://pay.example/stripe/${intentId}`
      : prov === PaymentProvider.UPI
        ? `upi://pay?pa=merchant@upi&pn=Repair+Shop&am=${Number(amount).toFixed(2)}&tn=Repair%20${repairOrderId}`
        : null;

    const payment = await Payment.create({
      repairOrderId,
      amount: Number(amount),
      method,
      status: PaymentStatus.PENDING,
      provider: prov,
      kind: kd,
      currencyCode: currencyCode || null,
      intentId: intentId,
      linkUrl: linkUrl,
      paidAt: null,
      notes: 'Payment intent created',
    } as any, { transaction: t });

    await t.commit();
    return res.status(201).json({ intent: { id: intentId, linkUrl }, payment });
  } catch (err) {
    await t.rollback();
    console.error('Create payment intent error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Confirm Payment Intent (mark payment completed)
export async function confirmPaymentIntent(req: AuthRequest, res: Response) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // intentId
    const { transactionId } = (req.body || {}) as any;
    const payment = await Payment.findOne({ where: { intentId: id } as any, transaction: t });
    if (!payment) { await t.rollback(); return res.status(404).json({ message: 'Intent not found' }); }
    if (payment.status !== PaymentStatus.PENDING) { await t.rollback(); return res.status(400).json({ message: 'Intent not pending' }); }

    payment.status = PaymentStatus.COMPLETED;
    (payment as any).transactionId = transactionId || `txn_${id}`;
    (payment as any).paidAt = new Date();
    await payment.save({ transaction: t });
    await t.commit();
    return res.status(200).json({ payment });
  } catch (err) {
    await t.rollback();
    console.error('Confirm payment intent error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Cancel Payment Intent (mark failed)
export async function cancelPaymentIntent(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params; // intentId
    const payment = await Payment.findOne({ where: { intentId: id } as any });
    if (!payment) return res.status(404).json({ message: 'Intent not found' });
    if (payment.status !== PaymentStatus.PENDING) return res.status(400).json({ message: 'Intent not pending' });
    payment.status = PaymentStatus.FAILED;
    await payment.save();
    return res.status(200).json({ payment });
  } catch (err) {
    console.error('Cancel payment intent error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Refund payment (partial/full)
export async function refundPayment(req: AuthRequest, res: Response) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // payment id to refund
    const { amount, notes } = (req.body || {}) as any;
    const original = await Payment.findByPk(id, { transaction: t });
    if (!original) { await t.rollback(); return res.status(404).json({ message: 'Payment not found' }); }
    if (original.status !== PaymentStatus.COMPLETED) { await t.rollback(); return res.status(400).json({ message: 'Only completed payments can be refunded' }); }

    // Validate not over-refunding for the repair order
    const completed = await Payment.findAll({ where: { repairOrderId: original.repairOrderId, status: PaymentStatus.COMPLETED } as any, transaction: t });
    const refunds = await Payment.findAll({ where: { repairOrderId: original.repairOrderId, status: PaymentStatus.REFUNDED } as any, transaction: t });
    const paidSum = completed.reduce((s, p) => s + Number(p.amount || 0), 0);
    const refundedSum = refunds.reduce((s, p) => s + Number(p.amount || 0), 0);
    const maxRefundable = Math.max(0, paidSum - refundedSum);
    const reqAmt = Number(amount || original.amount);
    if (!Number.isFinite(reqAmt) || reqAmt <= 0) { await t.rollback(); return res.status(400).json({ message: 'amount must be > 0' }); }
    if (reqAmt > maxRefundable) { await t.rollback(); return res.status(400).json({ message: 'Refund exceeds refundable amount' }); }

    const refund = await Payment.create({
      repairOrderId: original.repairOrderId,
      amount: reqAmt,
      method: original.method,
      status: PaymentStatus.REFUNDED,
      provider: original.provider ?? PaymentProvider.MANUAL,
      kind: PaymentKind.REFUND,
      currencyCode: original.currencyCode ?? null,
      transactionId: `rf_${Math.random().toString(36).slice(2)}`,
      paidAt: new Date(),
      notes: notes || `Refund for payment ${original.id}`,
    } as any, { transaction: t });

    // Audit log: refund created
    await logAudit(
      req,
      'Payment',
      refund.id,
      'refund',
      {
        repairOrderId: original.repairOrderId,
        originalPaymentId: original.id,
        refundedAmount: reqAmt,
        provider: original.provider ?? PaymentProvider.MANUAL,
        method: original.method,
        notes: refund.notes || null,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({ refund });
  } catch (err) {
    await t.rollback();
    console.error('Refund payment error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Generate invoice with tax rules
export async function getInvoiceForRepair(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params; // repairOrderId
    const repair = await RepairOrder.findByPk(id);
    if (!repair) return res.status(404).json({ message: 'Repair order not found' });

    // Access: customers can only get their own
    if (req.user?.role === 'customer' && req.user?.id) {
      const customer = await Customer.findOne({ where: { userId: req.user.id } });
      if (!customer || (repair as any).customerId !== (customer as any).id) return res.status(403).json({ message: 'Forbidden' });
    }

    const parts = await RepairPart.findAll({ where: { repairOrderId: id } as any, include: [{ model: Inventory, as: 'Inventory' }] as any });
    const payments = await Payment.findAll({ where: { repairOrderId: id } as any });

    // Compute totals
    const partsTotal = parts.reduce((s: number, p: any) => s + Number(p.unitPrice ?? p.Inventory?.sellingPrice ?? 0) * Number(p.quantity || 0), 0);
    const repairCost = Number((repair as any).estimatedCost || 0);
    const subTotal = partsTotal + repairCost;

    // Determine tax via TaxProfile by locationId
    let taxRate = 0;
    if ((repair as any).locationId) {
      const loc = await Location.findByPk((repair as any).locationId);
      if (loc) {
        const profile = await TaxProfile.findOne({ where: { locationKey: String(loc.id) } as any });
        taxRate = profile ? Number((profile as any).taxRate || 0) : 0;
      }
    }
    const tax = subTotal * (taxRate / 100);
    const grandTotal = subTotal + tax;
    const paymentsTotal = payments
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const refundsTotal = payments
      .filter((p) => p.status === PaymentStatus.REFUNDED)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const balanceDue = Math.max(0, grandTotal - paymentsTotal + refundsTotal);

    // Build simple HTML (reuse existing util renderer)
    const { buildRepairInvoiceHTML } = await import('../utils/invoice');
    const html = buildRepairInvoiceHTML(repair as any, null, parts as any, payments as any, {
      partsTotal,
      repairCost,
      grandTotal,
      paymentsTotal: paymentsTotal - refundsTotal,
      balanceDue,
    });

    return res.status(200).json({ totals: { partsTotal, repairCost, taxRate, tax, grandTotal, paymentsTotal, refundsTotal, balanceDue }, html });
  } catch (err) {
    console.error('Get invoice error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin: view all payments
export async function listAllPayments(req: AuthRequest, res: Response) {
  try {
    const { q, page = '1', pageSize = '20', sort = 'createdAt', direction = 'desc', method, status } = (req.query || {}) as Record<string, string | undefined>;

    const where: any = {};
    if (method && Object.values(PaymentMethod).includes(method as PaymentMethod)) where.method = method;
    if (status && Object.values(PaymentStatus).includes(status as PaymentStatus)) where.status = status;

    if (q && q.trim()) {
      const s = q.trim();
      // Search by transactionId or amount or notes
      where[Op.or] = [
        { transactionId: { [Op.iLike as any]: `%${s}%` } as any },
        { notes: { [Op.iLike as any]: `%${s}%` } as any },
      ];
      const asNumber = Number(s);
      if (Number.isFinite(asNumber)) {
        where[Op.or].push({ amount: asNumber });
      }
    }

    const validSort = ['createdAt', 'updatedAt', 'amount', 'method', 'status'];
    const sortCol = validSort.includes(String(sort)) ? String(sort) : 'createdAt';
    const dir = String(direction || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (p - 1) * ps;

    const { rows, count } = await (Payment as any).findAndCountAll({ where, order: [[sortCol, dir]] as any, limit: ps, offset });
    return res.status(200).json({
      payments: rows,
      total: count,
      page: p,
      pageSize: ps,
      sort: sortCol,
      direction: dir,
      q: q || '',
      filters: { method: method || null, status: status || null },
    });
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
