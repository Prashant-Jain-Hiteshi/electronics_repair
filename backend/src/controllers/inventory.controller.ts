import { Request, Response } from 'express';
import Inventory from '../models/Inventory';

export async function listInventory(_req: Request, res: Response) {
  try {
    const items = await Inventory.findAll();
    return res.status(200).json({ items });
  } catch (err) {
    console.error('List inventory error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function createInventory(req: Request, res: Response) {
  try {
    const item = await Inventory.create(req.body);
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
    return res.status(204).send();
  } catch (err) {
    console.error('Delete inventory error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
