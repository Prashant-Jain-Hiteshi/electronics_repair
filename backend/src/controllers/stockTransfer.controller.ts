import { Request, Response } from 'express';
import sequelize from '../config/database';
import StockTransfer from '../models/StockTransfer';
import InventoryStock from '../models/InventoryStock';
import Inventory from '../models/Inventory';

// POST /api/stock-transfers
export async function requestTransfer(req: Request, res: Response) {
  try {
    const { fromLocationId, toLocationId, inventoryId, quantity } = req.body || {};
    const qty = Number(quantity);
    if (!fromLocationId || !toLocationId || !inventoryId) {
      return res.status(400).json({ message: 'fromLocationId, toLocationId and inventoryId are required' });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: 'quantity must be a positive number' });
    }
    const inv = await Inventory.findByPk(inventoryId);
    if (!inv) return res.status(404).json({ message: 'Inventory item not found' });
    const reqAny = req as any;
    const transfer = await StockTransfer.create({
      fromLocationId,
      toLocationId,
      inventoryId,
      quantity: qty,
      status: 'pending',
      requestedBy: reqAny?.user?.id || null,
      approvedBy: null,
    } as any);
    return res.status(201).json({ transfer });
  } catch (err) {
    console.error('Request transfer error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// PUT /api/stock-transfers/:id/approve
export async function approveTransfer(req: Request, res: Response) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const transfer = await StockTransfer.findByPk(id, { transaction: t });
    if (!transfer) { await t.rollback(); return res.status(404).json({ message: 'Transfer not found' }); }
    if (transfer.status !== 'pending') { await t.rollback(); return res.status(400).json({ message: 'Transfer is not pending' }); }

    // Ensure stocks exist
    const fromKey = { inventoryId: transfer.inventoryId as any, locationId: transfer.fromLocationId as any } as any;
    const toKey = { inventoryId: transfer.inventoryId as any, locationId: transfer.toLocationId as any } as any;

    let fromStock = await InventoryStock.findOne({ where: fromKey, transaction: t });
    if (!fromStock) { await t.rollback(); return res.status(400).json({ message: 'Source location has no stock entry' }); }
    if (Number(fromStock.quantity) < Number(transfer.quantity)) {
      await t.rollback();
      return res.status(400).json({ message: 'Insufficient stock at source location' });
    }

    let toStock = await InventoryStock.findOne({ where: toKey, transaction: t });
    if (!toStock) {
      toStock = await InventoryStock.create({ ...toKey, quantity: 0 } as any, { transaction: t });
    }

    fromStock.quantity = Number(fromStock.quantity) - Number(transfer.quantity);
    toStock.quantity = Number(toStock.quantity) + Number(transfer.quantity);

    await fromStock.save({ transaction: t });
    await toStock.save({ transaction: t });

    const reqAny = req as any;
    transfer.status = 'approved' as any;
    transfer.approvedBy = reqAny?.user?.id || null;
    await transfer.save({ transaction: t });

    await t.commit();
    return res.status(200).json({ transfer });
  } catch (err) {
    await t.rollback();
    console.error('Approve transfer error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// PUT /api/stock-transfers/:id/reject
export async function rejectTransfer(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const transfer = await StockTransfer.findByPk(id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (transfer.status !== 'pending') return res.status(400).json({ message: 'Transfer is not pending' });
    transfer.status = 'rejected' as any;
    await transfer.save();
    return res.status(200).json({ transfer });
  } catch (err) {
    console.error('Reject transfer error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
