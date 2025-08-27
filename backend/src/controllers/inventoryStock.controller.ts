import { Request, Response } from 'express';
import sequelize from '../config/database';
import Inventory from '../models/Inventory';
import InventoryStock from '../models/InventoryStock';
import InventoryUsage from '../models/InventoryUsage';

// GET /api/inventory-stock/:locationId
export async function listStockByLocation(req: Request, res: Response) {
  try {
    const { locationId } = req.params;
    const stocks = await InventoryStock.findAll({ where: { locationId } as any, include: [{ model: Inventory, as: 'inventory' }] as any });
    return res.status(200).json({ items: stocks });
  } catch (err) {
    console.error('List stock by location error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// POST /api/inventory-stock/:inventoryId/adjust { locationId, delta, reason, note }
export async function adjustStockAtLocation(req: Request, res: Response) {
  const t = await sequelize.transaction();
  try {
    const { inventoryId } = req.params;
    const { locationId, delta, reason, note } = req.body || {};
    const qtyDelta = Number(delta);
    if (!locationId) { await t.rollback(); return res.status(400).json({ message: 'locationId is required' }); }
    if (!Number.isFinite(qtyDelta) || qtyDelta === 0) { await t.rollback(); return res.status(400).json({ message: 'delta must be a non-zero number' }); }

    const inv = await Inventory.findByPk(inventoryId, { transaction: t });
    if (!inv) { await t.rollback(); return res.status(404).json({ message: 'Inventory item not found' }); }

    let stock = await InventoryStock.findOne({ where: { inventoryId, locationId } as any, transaction: t });
    if (!stock) {
      stock = await InventoryStock.create({ inventoryId, locationId, quantity: 0 } as any, { transaction: t });
    }
    stock.quantity = Number(stock.quantity) + qtyDelta;
    if (stock.quantity < 0) { await t.rollback(); return res.status(400).json({ message: 'Resulting stock cannot be negative' }); }
    await stock.save({ transaction: t });

    // log usage (location-scoped)
    const reqAny = req as any;
    try {
      await InventoryUsage.create({
        inventoryId,
        repairOrderId: null,
        quantityChange: qtyDelta,
        reason: (reason as any) || (qtyDelta > 0 ? 'restock' : 'adjustment'),
        note: note || (qtyDelta > 0 ? `Restock at ${locationId}` : `Adjustment at ${locationId}`),
        createdBy: reqAny?.user?.id || null,
      } as any, { transaction: t });
    } catch (usageErr) {
      console.error('Failed to log inventory usage:', usageErr);
    }

    await t.commit();
    return res.status(200).json({ item: stock });
  } catch (err) {
    await t.rollback();
    console.error('Adjust stock at location error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
