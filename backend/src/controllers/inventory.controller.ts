import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import Inventory from '../models/Inventory';
import { emitToRole } from '../socket';
import InventoryUsage from '../models/InventoryUsage';
import { transporter } from '../utils/mailer';
import { v4 as uuidv4 } from 'uuid';

export async function listInventory(req: Request, res: Response) {
  try {
    const {
      q,
      category,
      isActive,
      page = '1',
      pageSize = '20',
      sort = 'createdAt',
      direction = 'desc',
    } = (req.query || {}) as Record<string, string | undefined>;

    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (p - 1) * ps;
    const dir = String(direction || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const where: WhereOptions = {};
    if (category) (where as any).category = category;
    if (typeof isActive !== 'undefined') (where as any).isActive = String(isActive) === 'true';
    if (q && q.trim()) {
      const s = q.trim();
      (where as any)[Op.or] = [
        { partName: { [Op.iLike as any]: `%${s}%` } as any },
        { partNumber: { [Op.iLike as any]: `%${s}%` } as any },
        { description: { [Op.iLike as any]: `%${s}%` } as any },
        { brand: { [Op.iLike as any]: `%${s}%` } as any },
        { supplier: { [Op.iLike as any]: `%${s}%` } as any },
        { category: { [Op.iLike as any]: `%${s}%` } as any },
      ];
    }
    const validSortCols = ['createdAt', 'updatedAt', 'partName', 'partNumber', 'category', 'quantity', 'sellingPrice'];
    const sortCol = validSortCols.includes(String(sort)) ? String(sort) : 'createdAt';

    const { rows, count } = await (Inventory as any).findAndCountAll({
      where,
      limit: ps,
      offset,
      order: [[sortCol, dir]] as any,
    });

    return res.status(200).json({
      items: rows,
      total: count,
      page: p,
      pageSize: ps,
      sort: sortCol,
      direction: dir,
      q: q || '',
      filters: { category: category || null, isActive: typeof isActive !== 'undefined' ? String(isActive) === 'true' : null },
    });
  } catch (err) {
    console.error('List inventory error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function createInventory(req: Request, res: Response) {
  try {
    const item = await Inventory.create(req.body);
    try {
      emitToRole('admin', 'inventory:changed', { action: 'create', item });
      emitToRole('technician', 'inventory:changed', { action: 'create', item });
    } catch {}
    return res.status(201).json({ item });
  } catch (err) {
    console.error('Create inventory error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateInventory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const item = await Inventory.findByPk(id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await item.update(req.body);
    try {
      emitToRole('admin', 'inventory:changed', { action: 'update', item });
      emitToRole('technician', 'inventory:changed', { action: 'update', item });
    } catch {}
    return res.status(200).json({ item });
  } catch (err) {
    console.error('Update inventory error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteInventory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const item = await Inventory.findByPk(id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await item.destroy();
    try {
      emitToRole('admin', 'inventory:changed', { action: 'delete', id });
      emitToRole('technician', 'inventory:changed', { action: 'delete', id });
    } catch {}
    return res.status(204).send();
  } catch (err) {
    console.error('Delete inventory error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// GET /api/inventory/low-stock
export async function listLowStock(_req: Request, res: Response) {
  try {
    const items = await Inventory.findAll({ where: { isActive: true } as any });
    const low = items.filter((i: any) => Number(i.quantity) <= Number(i.minStockLevel));
    return res.status(200).json({ items: low });
  } catch (err) {
    console.error('List low stock error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// GET /api/inventory/:id/usage
export async function listUsage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const inv = await Inventory.findByPk(id);
    if (!inv) return res.status(404).json({ message: 'Item not found' });
    const usage = await InventoryUsage.findAll({ where: { inventoryId: id } as any, order: [['createdAt', 'DESC']] as any });
    return res.status(200).json({ usage });
  } catch (err) {
    console.error('List usage error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// POST /api/inventory/:id/adjust { delta, reason, note }
export async function adjustInventory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { delta, reason, note } = req.body || {};
    const qtyDelta = Number(delta);
    if (!Number.isFinite(qtyDelta) || qtyDelta === 0) {
      return res.status(400).json({ message: 'delta must be a non-zero number' });
    }
    const inv = await Inventory.findByPk(id);
    if (!inv) return res.status(404).json({ message: 'Item not found' });

    inv.quantity = inv.quantity + qtyDelta;
    await inv.save();

    const reqAny = req as any;
    try {
      await InventoryUsage.create({
        inventoryId: id,
        repairOrderId: null,
        quantityChange: qtyDelta,
        reason: (reason as any) || (qtyDelta > 0 ? 'restock' : 'adjustment'),
        note: note || (qtyDelta > 0 ? 'Manual restock' : 'Manual adjustment'),
        createdBy: reqAny?.user?.id || null,
      });
    } catch (usageErr) {
      console.error('Failed to log inventory usage (adjust):', usageErr);
    }

    // Emits
    try {
      emitToRole('admin', 'inventory:changed', { action: 'update', item: inv });
      emitToRole('technician', 'inventory:changed', { action: 'update', item: inv });
      if (inv.quantity <= inv.minStockLevel) {
        emitToRole('admin', 'inventory:low', {
          id: inv.id,
          partName: (inv as any).partName,
          partNumber: (inv as any).partNumber,
          quantity: inv.quantity,
          minStockLevel: inv.minStockLevel,
        });
        // optional email
        const to = process.env.ADMIN_ALERT_EMAIL;
        if (to) {
          try {
            await transporter.sendMail({
              to,
              from: process.env.SMTP_USER || 'no-reply@example.com',
              subject: `Low stock alert: ${(inv as any).partName} (${(inv as any).partNumber})`,
              text: `Item ${(inv as any).partName} (${(inv as any).partNumber}) is low on stock. Qty: ${inv.quantity}, Min: ${inv.minStockLevel}.`,
            });
          } catch (mailErr) {
            console.error('Low stock email failed:', mailErr);
          }
        }
      }
    } catch (emitErr) {
      console.error('Inventory emits failed:', emitErr);
    }

    return res.status(200).json({ item: inv });
  } catch (err) {
    console.error('Adjust inventory error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// POST /api/inventory/:id/reserve { repairOrderId, qty, note }
export async function reservePart(req: Request, res: Response) {
  try {
    const { id } = req.params; // inventoryId
    const { repairOrderId, qty, note } = req.body || {};
    const quantity = Number(qty);
    if (!repairOrderId) return res.status(400).json({ message: 'repairOrderId is required' });
    if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ message: 'qty must be > 0' });

    const inv = await Inventory.findByPk(id);
    if (!inv) return res.status(404).json({ message: 'Item not found' });
    if (inv.quantity < quantity) return res.status(400).json({ message: 'Insufficient stock to reserve' });

    // Deduct immediately to hold stock
    inv.quantity = inv.quantity - quantity;
    await inv.save();

    const reqAny = req as any;
    const barcode = `RES-${(inv as any).sku || (inv as any).partNumber}-${uuidv4()}`;
    const usage = await InventoryUsage.create({
      inventoryId: id,
      repairOrderId,
      quantityChange: -quantity,
      reason: 'usage',
      note: note || 'Reserved for repair',
      createdBy: reqAny?.user?.id || null,
      status: 'reserved' as any,
      reservedQty: quantity,
      barcode,
    } as any);

    try {
      emitToRole('admin', 'inventory:reservation', { action: 'reserved', usage });
      emitToRole('technician', 'inventory:reservation', { action: 'reserved', usage });
    } catch {}

    return res.status(201).json({ reservation: usage, item: inv });
  } catch (err) {
    console.error('Reserve part error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// POST /api/inventory/reservations/:reservationId/cancel
export async function cancelReservation(req: Request, res: Response) {
  try {
    const { reservationId } = req.params as any;
    const usage = await InventoryUsage.findByPk(reservationId) as any;
    if (!usage) return res.status(404).json({ message: 'Reservation not found' });
    if (usage.status === 'consumed') return res.status(400).json({ message: 'Already consumed' });
    if (usage.status === 'cancelled') return res.status(200).json({ reservation: usage });

    const inv = await Inventory.findByPk(usage.inventoryId) as any;
    if (!inv) return res.status(404).json({ message: 'Inventory not found' });

    // Return stock
    inv.quantity = inv.quantity + (usage.reservedQty || Math.abs(usage.quantityChange));
    await inv.save();

    usage.status = 'cancelled';
    usage.cancelledAt = new Date();
    await usage.save();

    // Log reversal entry
    const reqAny = req as any;
    try {
      await InventoryUsage.create({
        inventoryId: usage.inventoryId,
        repairOrderId: usage.repairOrderId,
        quantityChange: (usage.reservedQty || Math.abs(usage.quantityChange)),
        reason: 'reversal',
        note: `Reservation ${usage.id} cancelled`,
        createdBy: reqAny?.user?.id || null,
      } as any);
    } catch {}

    try {
      emitToRole('admin', 'inventory:reservation', { action: 'cancelled', id: usage.id });
      emitToRole('technician', 'inventory:reservation', { action: 'cancelled', id: usage.id });
    } catch {}

    return res.status(200).json({ reservation: usage, item: inv });
  } catch (err) {
    console.error('Cancel reservation error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// POST /api/inventory/reservations/:reservationId/pick { barcode? }
export async function pickReservation(req: Request, res: Response) {
  try {
    const { reservationId } = req.params as any;
    const { barcode } = req.body || {};
    const usage = await InventoryUsage.findByPk(reservationId) as any;
    if (!usage) return res.status(404).json({ message: 'Reservation not found' });
    if (usage.status === 'cancelled') return res.status(400).json({ message: 'Reservation cancelled' });
    if (usage.status === 'consumed') return res.status(400).json({ message: 'Already consumed' });

    usage.status = 'picked';
    usage.pickedAt = new Date();
    if (barcode) usage.barcode = barcode;
    await usage.save();

    try {
      emitToRole('admin', 'inventory:reservation', { action: 'picked', id: usage.id });
      emitToRole('technician', 'inventory:reservation', { action: 'picked', id: usage.id });
    } catch {}

    return res.status(200).json({ reservation: usage });
  } catch (err) {
    console.error('Pick reservation error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// POST /api/inventory/reservations/:reservationId/consume
export async function consumeReservation(req: Request, res: Response) {
  try {
    const { reservationId } = req.params as any;
    const usage = await InventoryUsage.findByPk(reservationId) as any;
    if (!usage) return res.status(404).json({ message: 'Reservation not found' });
    if (usage.status === 'cancelled') return res.status(400).json({ message: 'Reservation cancelled' });
    if (usage.status === 'consumed') return res.status(200).json({ reservation: usage });

    usage.status = 'consumed';
    usage.consumedAt = new Date();
    await usage.save();

    try {
      emitToRole('admin', 'inventory:reservation', { action: 'consumed', id: usage.id });
      emitToRole('technician', 'inventory:reservation', { action: 'consumed', id: usage.id });
    } catch {}

    return res.status(200).json({ reservation: usage });
  } catch (err) {
    console.error('Consume reservation error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// GET /api/inventory/reservations?repairOrderId=
export async function listReservations(req: Request, res: Response) {
  try {
    const { repairOrderId } = (req.query || {}) as Record<string, string | undefined>;
    const where: any = {};
    if (repairOrderId) where.repairOrderId = repairOrderId;
    const reservations = await InventoryUsage.findAll({ where, order: [['createdAt', 'DESC']] as any });
    return res.status(200).json({ reservations });
  } catch (err) {
    console.error('List reservations error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// POST /api/inventory/scan { barcode }
export async function scanBarcode(req: Request, res: Response) {
  try {
    const { barcode } = req.body || {};
    if (!barcode) return res.status(400).json({ message: 'barcode is required' });
    const reservation = await InventoryUsage.findOne({ where: { barcode } as any });
    if (!reservation) return res.status(404).json({ message: 'Not found' });
    return res.status(200).json({ reservation });
  } catch (err) {
    console.error('Scan barcode error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// GET /api/inventory/labels/:reservationId -> payload for printing
export async function getReservationLabel(req: Request, res: Response) {
  try {
    const { reservationId } = req.params as any;
    const usage = await InventoryUsage.findByPk(reservationId) as any;
    if (!usage) return res.status(404).json({ message: 'Reservation not found' });
    const inv = await Inventory.findByPk(usage.inventoryId) as any;
    const payload = {
      title: 'Repair Reservation',
      repairOrderId: usage.repairOrderId,
      partName: inv?.partName || '',
      partNumber: inv?.partNumber || '',
      qty: usage.reservedQty || Math.abs(usage.quantityChange),
      barcode: usage.barcode,
      timestamp: new Date().toISOString(),
    };
    return res.status(200).json({ label: payload });
  } catch (err) {
    console.error('Get label error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
