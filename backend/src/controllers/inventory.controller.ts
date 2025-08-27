import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import Inventory from '../models/Inventory';
import { emitToRole } from '../socket';
import InventoryUsage from '../models/InventoryUsage';
import { transporter } from '../utils/mailer';

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
