import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Customer from '../models/Customer';
import User, { UserRole } from '../models/User';

export async function listAllCustomers(_req: AuthRequest, res: Response) {
  try {
    const customers = await Customer.findAll();
    // Attach minimal user info for admin table display (name + mobile)
    const userIds = customers.map((c: any) => c.userId).filter(Boolean);
    const uniqueUserIds = Array.from(new Set(userIds));
    const users = await User.findAll({ where: { id: uniqueUserIds } as any });
    const userMap = new Map(users.map((u: any) => [u.id, u.toJSON()]));

    const enriched = customers.map((c: any) => ({
      ...c.toJSON(),
      user: userMap.get(c.userId)
        ? {
            id: userMap.get(c.userId)!.id,
            firstName: userMap.get(c.userId)!.firstName,
            lastName: userMap.get(c.userId)!.lastName,
            phone: userMap.get(c.userId)!.mobile,
            isActive: userMap.get(c.userId)!.isActive,
          }
        : undefined,
    }));

    return res.status(200).json({ customers: enriched });
  } catch (err) {
    console.error('List customers error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin: get a customer by id
export async function adminGetCustomer(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const user = await User.findByPk((customer as any).userId);
    return res.status(200).json({ customer, user: user?.toJSON() });
  } catch (err) {
    console.error('Admin get customer error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin: create a customer (creates User + Customer)
export async function adminCreateCustomer(req: AuthRequest, res: Response) {
  try {
    const { mobile, firstName, lastName, address, profile } = req.body || {};
    if (!mobile || !firstName || !lastName) {
      return res.status(400).json({ message: 'mobile, firstName, lastName are required' });
    }
    const exists = await User.findOne({ where: { mobile } });
    if (exists) return res.status(409).json({ message: 'Mobile already registered' });
    const user = await User.create({ mobile, firstName, lastName, address, role: UserRole.CUSTOMER, isVerified: true } as any);
    const customer = await Customer.create({ userId: user.id, ...(profile || {}) });
    return res.status(201).json({ user: user.toJSON(), customer });
  } catch (err) {
    console.error('Admin create customer error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin: update customer (basic user fields + customer profile fields)
export async function adminUpdateCustomer(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params; // customerId
    const customer = await Customer.findByPk(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const user = await User.findByPk((customer as any).userId);

    const { firstName, lastName, mobile, address, isActive, profile } = req.body || {};
    if (user) {
      if (firstName != null) (user as any).firstName = firstName;
      if (lastName != null) (user as any).lastName = lastName;
      // Updating mobile is optional and must be unique; keep simple check here if provided
      if (mobile != null) (user as any).mobile = mobile;
      if (address != null) (user as any).address = address;
      if (isActive != null) (user as any).isActive = !!isActive;
      await user.save();
    }

    if (profile && typeof profile === 'object') {
      const fields = ['address', 'city', 'state', 'zipCode', 'devicePreferences', 'notes'] as const;
      for (const f of fields) {
        (customer as any)[f] = (profile as any)[f] ?? (customer as any)[f];
      }
      await customer.save();
    }

    return res.status(200).json({ user: user?.toJSON(), customer });
  } catch (err) {
    console.error('Admin update customer error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin: delete/deactivate a customer
export async function adminDeleteCustomer(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params; // customerId
    const customer = await Customer.findByPk(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const user = await User.findByPk((customer as any).userId);
    if (user) {
      (user as any).isActive = false;
      await user.save();
    }
    // Keep customer row for history; don't hard delete.
    return res.status(204).send();
  } catch (err) {
    console.error('Admin delete customer error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getMyProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    const customer = await Customer.findOne({ where: { userId: req.user.id } });
    if (!customer) return res.status(404).json({ message: 'Customer profile not found' });
    return res.status(200).json({ customer });
  } catch (err) {
    console.error('Get my profile error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateMyProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    const customer = await Customer.findOne({ where: { userId: req.user.id } });
    if (!customer) return res.status(404).json({ message: 'Customer profile not found' });

    const { address, city, state, zipCode, devicePreferences, notes } = req.body || {};
    customer.address = address ?? customer.address;
    customer.city = city ?? customer.city;
    customer.state = state ?? customer.state;
    customer.zipCode = zipCode ?? customer.zipCode;
    customer.devicePreferences = devicePreferences ?? customer.devicePreferences;
    customer.notes = notes ?? customer.notes;
    await customer.save();

    return res.status(200).json({ customer });
  } catch (err) {
    console.error('Update my profile error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
