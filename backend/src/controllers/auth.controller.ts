import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';
import { generateOtp, sendOtpEmail } from '../utils/mailer';

function signToken(payload: object) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

// Admin: list all technicians
export async function listTechnicians(_req: Request, res: Response) {
  try {
    const technicians = await User.findAll({ where: { role: UserRole.TECHNICIAN } as any });
    return res.status(200).json({ technicians: technicians.map((u) => u.toJSON()) });
  } catch (err: any) {
    console.error('List technicians error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Signup (OTP-based, no password). Creates a customer and emails OTP.
export async function signup(req: Request, res: Response) {
  try {
    const { email, firstName, lastName, phone } = req.body || {};
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: 'email, firstName, lastName are required' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const code = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      email,
      firstName,
      lastName,
      phone,
      role: UserRole.CUSTOMER,
      isVerified: false,
      otpCode: code,
      otpExpiresAt: expires,
    } as any);

    await sendOtpEmail(email, code, 'signup');
    return res.status(201).json({ message: 'OTP sent to email', user: user.toJSON() });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Login request: send OTP to existing user
export async function loginRequestOtp(req: Request, res: Response) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'email is required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ message: 'User is inactive' });

    const code = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    (user as any).otpCode = code;
    (user as any).otpExpiresAt = expires;
    await user.save();
    await sendOtpEmail(email, code, 'login');
    return res.status(200).json({ message: 'OTP sent to email' });
  } catch (err: any) {
    console.error('Login request OTP error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Common OTP verification (signup or login)
export async function verifyOtp(req: Request, res: Response) {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ message: 'email and otp are required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    if (!(user as any).otpCode || (user as any).otpCode !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    if ((user as any).otpExpiresAt && now > new Date((user as any).otpExpiresAt)) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    (user as any).otpCode = null;
    (user as any).otpExpiresAt = null;
    (user as any).isVerified = true;
    await user.save();

    const token = signToken({ id: user.id, role: user.role });
    return res.status(200).json({ user: user.toJSON(), token });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function me(req: Request & { user?: any }, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user: user.toJSON() });
  } catch (err: any) {
    console.error('Me error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin-only: promote/demote a user's role
export async function promoteUser(req: Request, res: Response) {
  try {
    const { userId, email, role } = req.body || {};
    const allowed = Object.values(UserRole);
    if (!role || !allowed.includes(role)) {
      return res.status(400).json({ message: `role must be one of: ${allowed.join(', ')}` });
    }

    let user: User | null = null;
    if (userId) user = await User.findByPk(userId);
    else if (email) user = await User.findOne({ where: { email } });
    else return res.status(400).json({ message: 'userId or email is required' });

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = role;
    await user.save();
    return res.status(200).json({ user: user.toJSON() });
  } catch (err: any) {
    console.error('Promote user error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
