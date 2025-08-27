import { Request, Response } from 'express';
import Location from '../models/Location';

// POST /api/locations
export async function createLocation(req: Request, res: Response) {
  try {
    const { name, address, city, state, country } = req.body || {};
    if (!name || String(name).trim() === '') {
      return res.status(400).json({ message: 'name is required' });
    }
    const exists = await Location.findOne({ where: { name } as any });
    if (exists) return res.status(409).json({ message: 'Location with this name already exists' });
    const loc = await Location.create({ name, address: address ?? null, city: city ?? null, state: state ?? null, country: country ?? null } as any);
    return res.status(201).json({ location: loc });
  } catch (err) {
    console.error('Create location error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// GET /api/locations
export async function listLocations(_req: Request, res: Response) {
  try {
    const locations = await Location.findAll({ order: [['name', 'ASC']] as any });
    return res.status(200).json({ locations });
  } catch (err) {
    console.error('List locations error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
