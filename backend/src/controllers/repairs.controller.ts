import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import RepairOrder, { RepairStatus, Priority } from '../models/RepairOrder';
import Customer from '../models/Customer';
import Inventory from '../models/Inventory';
import RepairPart from '../models/RepairPart';
import Payment from '../models/Payment';
import sequelize from '../config/database';
import { buildRepairInvoiceHTML, InvoiceTotals } from '../utils/invoice';
import User, { UserRole } from '../models/User';
import RepairAttachment from '../models/RepairAttachment';
import { emitToUser } from '../socket';

// Technician/Admin: list all repair orders
export async function listAllRepairs(_req: AuthRequest, res: Response) {
  try {
    const repairs = await RepairOrder.findAll({ order: [['createdAt', 'DESC']] as any });
    return res.status(200).json({ repairs });
  } catch (err) {
    console.error('List repairs error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin: delete a repair order (cascades parts, keeps payments history)
export async function deleteRepair(req: AuthRequest, res: Response) {
  try {
    if ((req.user as any)?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const repair = await RepairOrder.findByPk(id);
    if (!repair) return res.status(404).json({ message: 'Repair order not found' });

    // Remove linked parts
    await RepairPart.destroy({ where: { repairOrderId: id } as any });
    // Keep payments for audit trail
    await repair.destroy();
    return res.status(204).send();
  } catch (err) {
    console.error('Delete repair error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Get single repair order (customer can access only own order)
export async function getRepairById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });

    const repair = await RepairOrder.findByPk(id);
    if (!repair) return res.status(404).json({ message: 'Repair order not found' });

    if ((req.user as any).role === 'customer') {
      const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } });
      if ((repair as any).customerId !== (cust as any).id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    // For admin/technician, include customer and minimal user details
    let customer: any = null;
    let user: any = null;
    if ((req.user as any).role === 'admin' || (req.user as any).role === 'technician') {
      customer = await Customer.findByPk((repair as any).customerId);
      if (customer) {
        const u = await User.findByPk((customer as any).userId);
        user = u ? u.toJSON() : null;
        if (user) delete (user as any).password;
      }
    }
    return res.status(200).json({ repair, customer, user });
  } catch (err) {
    console.error('Get repair by id error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Customer: list own repair orders
export async function listMyRepairs(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    // Ensure a customer row exists for this user (no external checks, silent create)
    const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } });
    const repairs = await RepairOrder.findAll({ where: { customerId: (cust as any).id } });
    return res.status(200).json({ repairs });
  } catch (err) {
    console.error('List my repairs error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Create repair order (Customer creates for themselves; Technician can also create)
export async function createRepair(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });

    const body = req.body || {};
    // Use provided customerId or silently create/find one for current user
    let customerId = body.customerId as string | undefined;
    if (!customerId) {
      const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } });
      customerId = (cust as any).id as string;
    }

    // Map UI field names to model
    const deviceType = (body.deviceType as string) || '';
    const brand = (body.deviceBrand as string) || (body.brand as string) || '';
    const model = (body.deviceModel as string) || (body.model as string) || '';
    const issueDescription = (body.issueDescription as string) || '';
    const pickupDate = body.pickupDate as string | undefined; // YYYY-MM-DD

    if (!deviceType || !brand || !model || !issueDescription) {
      return res.status(400).json({ message: 'deviceType, brand, model, and issueDescription are required' });
    }

    const estimatedCompletionDate = pickupDate ? new Date(pickupDate) : undefined;

    const payload: Partial<RepairOrder> = {
      customerId,
      deviceType,
      brand,
      model,
      issueDescription,
      status: RepairStatus.PENDING,
      priority: Priority.MEDIUM,
      estimatedCompletionDate,
    } as any;

    const repair = await RepairOrder.create(payload as any);

    // Persist any uploaded images as attachments
    const files = ((req as any).files as Express.Multer.File[] | undefined) || [];
    const createdAttachments: any[] = [];
    if (files.length > 0) {
      const destDir = path.join('uploads', 'repairs', (repair as any).id as string);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      for (const f of files) {
        try {
          let ext = path.extname(f.originalname) || '';
          if (!ext) {
            // derive from mimetype
            if (/jpeg|jpg/i.test(f.mimetype)) ext = '.jpg';
            else if (/png/i.test(f.mimetype)) ext = '.png';
            else if (/webp/i.test(f.mimetype)) ext = '.webp';
          }
          const newName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          const targetPath = path.join(destDir, newName);
          // Move the uploaded file from temp (uploads/repairs or OS temp) to the repair-specific directory
          fs.renameSync(f.path, targetPath);

          const att = await RepairAttachment.create({
            repairOrderId: (repair as any).id,
            filename: newName,
            originalName: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
            uploadedByUserId: req.user.id,
          } as any);
          createdAttachments.push(att);
        } catch (moveErr) {
          console.error('Failed to persist uploaded image:', moveErr);
        }
      }
    }

    return res.status(201).json({ repair, attachments: createdAttachments });
  } catch (err) {
    console.error('Create repair error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Technician/Admin: update repair order
export async function updateRepair(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const repair = await RepairOrder.findByPk(id);
    if (!repair) return res.status(404).json({ message: 'Repair order not found' });
    const prevStatus = repair.status;
    await repair.update(req.body);

    // If status changed, notify the customer via Socket.IO
    try {
      const newStatus = (repair as any).status as RepairStatus;
      if (prevStatus !== newStatus) {
        const customer = await Customer.findByPk((repair as any).customerId);
        const userId = (customer as any)?.userId as string | undefined;
        if (userId) {
          const productName = `${(repair as any).deviceType || ''} ${(repair as any).brand || ''} ${(repair as any).model || ''}`.trim();
          emitToUser(userId, 'notification:new', {
            kind: 'repair_status',
            repairId: (repair as any).id,
            previousStatus: prevStatus,
            status: newStatus,
            title: productName || 'Repair update',
            message: `Status updated to ${newStatus}.`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (notifyErr) {
      console.error('Failed to emit status change notification:', notifyErr);
    }

    return res.status(200).json({ repair });
  } catch (err) {
    console.error('Update repair error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin: assign a technician to a repair order
export async function assignTechnician(req: AuthRequest, res: Response) {
  try {
    if ((req.user as any)?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params; // repairOrderId
    const { technicianId } = req.body || {};
    if (!technicianId) return res.status(400).json({ message: 'technicianId is required' });

    const repair = await RepairOrder.findByPk(id);
    if (!repair) return res.status(404).json({ message: 'Repair order not found' });

    const tech = await User.findByPk(technicianId);
    if (!tech || (tech as any).role !== UserRole.TECHNICIAN) {
      return res.status(400).json({ message: 'Invalid technicianId' });
    }

    (repair as any).technicianId = technicianId;
    await repair.save();
    return res.status(200).json({ repair });
  } catch (err) {
    console.error('Assign technician error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin: overview stats for dashboard
export async function adminOverview(_req: AuthRequest, res: Response) {
  try {
    const [repairsCount, customersCount, techniciansCount, inventoryCount, paymentsTotal] = await Promise.all([
      RepairOrder.count(),
      Customer.count(),
      User.count({ where: { role: UserRole.TECHNICIAN } as any }),
      Inventory.count(),
      Payment.sum('amount').then((v: any) => Number(v || 0)),
    ]);

    const statusBuckets = await RepairOrder.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
      group: ['status'],
    });

    return res.status(200).json({
      repairsCount,
      customersCount,
      techniciansCount,
      inventoryCount,
      paymentsTotal,
      byStatus: statusBuckets.map((r: any) => ({ status: r.status, count: Number(r.get('count')) })),
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// List parts for a repair order
export async function listRepairParts(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params; // repairOrderId
    const repair = await RepairOrder.findByPk(id);
    if (!repair) return res.status(404).json({ message: 'Repair order not found' });

    // If called by a customer, ensure they own this repair
    if ((req.user as any)?.role === 'customer') {
      if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
      const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } });
      if ((repair as any).customerId !== (cust as any).id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const parts = await RepairPart.findAll({
      where: { repairOrderId: id },
      include: [{ model: Inventory, as: 'Inventory' as any, required: false } as any],
    });
    return res.status(200).json({ parts });
  } catch (err) {
    console.error('List repair parts error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Add a part to a repair order and decrement inventory
export async function addRepairPart(req: Request, res: Response) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // repairOrderId
    const { inventoryId, quantity, unitPrice } = req.body || {};
    if (!inventoryId || !quantity || Number(quantity) <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'inventoryId and quantity (>0) are required' });
    }

    const repair = await RepairOrder.findByPk(id, { transaction: t });
    if (!repair) {
      await t.rollback();
      return res.status(404).json({ message: 'Repair order not found' });
    }
    const inv = await Inventory.findByPk(inventoryId, { transaction: t });
    if (!inv) {
      await t.rollback();
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    if (inv.quantity < Number(quantity)) {
      await t.rollback();
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const rp = await RepairPart.create(
      {
        repairOrderId: id,
        inventoryId,
        quantity: Number(quantity),
        unitPrice: unitPrice != null ? Number(unitPrice) : (inv as any).sellingPrice,
      },
      { transaction: t }
    );

    inv.quantity = inv.quantity - Number(quantity);
    await inv.save({ transaction: t });

    await t.commit();
    return res.status(201).json({ part: rp });
  } catch (err) {
    await t.rollback();
    console.error('Add repair part error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Remove a part from a repair order and restore inventory
export async function removeRepairPart(req: Request, res: Response) {
  const t = await sequelize.transaction();
  try {
    const { id, repairPartId } = req.params; // id: repairOrderId
    const part = await RepairPart.findOne({ where: { id: repairPartId, repairOrderId: id }, transaction: t });
    if (!part) {
      await t.rollback();
      return res.status(404).json({ message: 'Repair part not found' });
    }

    const inv = await Inventory.findByPk(part.inventoryId, { transaction: t });
    if (inv) {
      inv.quantity = inv.quantity + Number(part.quantity || 0);
      await inv.save({ transaction: t });
    }

    await part.destroy({ transaction: t });
    await t.commit();
    return res.status(204).send();
  } catch (err) {
    await t.rollback();
    console.error('Remove repair part error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Generate invoice HTML for a repair order
export async function getRepairInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const repair = await RepairOrder.findByPk(id);
    if (!repair) return res.status(404).json({ message: 'Repair order not found' });
    // If called by a customer, ensure ownership
    const reqAny = req as any;
    if (reqAny.user?.role === 'customer' && reqAny.user?.id) {
      const [cust] = await Customer.findOrCreate({ where: { userId: reqAny.user.id }, defaults: { userId: reqAny.user.id } });
      if ((repair as any).customerId !== (cust as any).id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const customer = await Customer.findByPk(repair.customerId);
    const parts = (await RepairPart.findAll({
      where: { repairOrderId: id },
      include: [{ model: Inventory, as: 'Inventory' as any, required: false } as any],
    })) as any[];
    const payments = await Payment.findAll({ where: { repairOrderId: id } });

    const partsTotal = parts.reduce((sum, p: any) => {
      const unit = Number(p.unitPrice ?? p.Inventory?.sellingPrice ?? 0);
      const qty = Number(p.quantity || 0);
      return sum + unit * qty;
    }, 0);
    const repairCost = Number(repair.actualCost ?? repair.estimatedCost ?? 0);
    const grandTotal = repairCost + partsTotal;
    const paymentsTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const balanceDue = grandTotal - paymentsTotal;
    const totals: InvoiceTotals = { partsTotal, repairCost, grandTotal, paymentsTotal, balanceDue };

    const html = buildRepairInvoiceHTML(repair, customer || null, parts as any, payments, totals);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Get repair invoice error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Cancel a repair order
export async function cancelRepair(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });

    const repair = await RepairOrder.findByPk(id);
    if (!repair) return res.status(404).json({ message: 'Repair order not found' });

    // If customer, ensure ownership
    if ((req.user as any).role === 'customer') {
      const [cust] = await Customer.findOrCreate({ where: { userId: req.user.id }, defaults: { userId: req.user.id } });
      if ((repair as any).customerId !== (cust as any).id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    if (repair.status !== RepairStatus.PENDING) {
      return res.status(400).json({ message: 'Only pending repairs can be cancelled' });
    }

    repair.status = RepairStatus.CANCELLED;
    await repair.save();

    // Notify the customer about cancellation
    try {
      const customer = await Customer.findByPk((repair as any).customerId);
      const userId = (customer as any)?.userId as string | undefined;
      if (userId) {
        const productName = `${(repair as any).deviceType || ''} ${(repair as any).brand || ''} ${(repair as any).model || ''}`.trim();
        emitToUser(userId, 'notification:new', {
          kind: 'repair_status',
          repairId: (repair as any).id,
          previousStatus: RepairStatus.PENDING,
          status: RepairStatus.CANCELLED,
          title: productName || 'Repair cancelled',
          message: 'Status updated to CANCELLED.',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (notifyErr) {
      console.error('Failed to emit cancellation notification:', notifyErr);
    }

    return res.status(200).json({ repair });
  } catch (err) {
    console.error('Cancel repair error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
