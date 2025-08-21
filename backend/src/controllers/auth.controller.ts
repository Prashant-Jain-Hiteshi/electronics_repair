 import { Request, Response } from 'express';
 import jwt from 'jsonwebtoken';
 import User, { UserRole } from '../models/User';
 import { generateOtp } from '../utils/mailer';
 import { sendOtpSms } from '../utils/twilio';

function signToken(payload: object) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

// Temporary in-memory OTP store for mobiles without a user yet
// Map: mobile -> { code, expiresAt }
const tempOtpStore: Map<string, { code: string; expiresAt: number }> = new Map();

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

// Request OTP for login/signup using mobile number. Returns exists flag and OTP for testing.
export async function requestOtp(req: Request, res: Response) {
  try {
    const { mobile } = req.body || {};
    if (!mobile) return res.status(400).json({ message: 'Valid Indian mobile is required' });
    // Validate Indian mobile number
    const re = /^\d{10}$/;
    if (!re.test(mobile)) return res.status(400).json({ message: 'Valid Indian mobile is required' });

    const user = await User.findOne({ where: { mobile } });
    const code = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    if (user) {
      (user as any).otpCode = code;
      (user as any).otpExpiresAt = expires;
      await user.save();
    } else {
      tempOtpStore.set(mobile, { code, expiresAt: expires.getTime() });
    }

    // Send SMS via Twilio (best-effort). Also return OTP in response for testing.
    try {
      await sendOtpSms(mobile, code);
    } catch (e) {
      console.warn('Twilio send error (non-fatal):', e);
    }

    return res.status(200).json({ message: 'OTP sent to mobile', exists: !!user, otp: code });
  } catch (err: any) {
    console.error('Request OTP error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Verify OTP for login or signup. If user doesn't exist, require profile fields and create user.
export async function verifyOtp(req: Request, res: Response) {
  try {
    const { mobile, otp, firstName, lastName, address } = req.body || {};
    if (!mobile || !otp) return res.status(400).json({ message: 'mobile and otp are required' });

    let user = await User.findOne({ where: { mobile } });
    const now = new Date();

    // If existing user, validate OTP on record
    if (user) {
      if (!user.isActive) return res.status(403).json({ message: 'User is inactive' });
      if (!(user as any).otpCode || (user as any).otpCode !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
      if ((user as any).otpExpiresAt && now > new Date((user as any).otpExpiresAt)) {
        return res.status(400).json({ message: 'OTP expired' });
      }
    } else {
      // New user path: require profile fields
      if (!firstName || !lastName || !address) {
        return res
          .status(400)
          .json({ message: 'firstName, lastName, and address are required for new users' });
      }
      // Validate OTP using the temporary store
      const entry = tempOtpStore.get(mobile);
      if (!entry || entry.code !== otp || now.getTime() > entry.expiresAt) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
      tempOtpStore.delete(mobile);
      user = await User.create({
        mobile,
        firstName,
        lastName,
        address,
        role: UserRole.CUSTOMER,
        isVerified: true,
      } as any);
    }

    // Clear OTP for existing user and mark verified
    if (user) {
      (user as any).otpCode = null;
      (user as any).otpExpiresAt = null;
      (user as any).isVerified = true;
      await (user as any).save?.();
    }

    const token = signToken({ id: (user as any).id, role: (user as any).role });
    return res.status(200).json({ user: (user as any).toJSON?.() || user, token });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Common OTP verification (signup or login)
 // me, promoteUser remain similar but switch any email-based lookup to mobile where applicable

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
    const { userId, mobile, role } = req.body || {};
    const allowed = Object.values(UserRole);
    if (!role || !allowed.includes(role)) {
      return res.status(400).json({ message: `role must be one of: ${allowed.join(', ')}` });
    }

    let user: User | null = null;
    if (userId) user = await User.findByPk(userId);
    else if (mobile) user = await User.findOne({ where: { mobile } });
    else return res.status(400).json({ message: 'userId or mobile is required' });

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = role;
    await user.save();
    return res.status(200).json({ user: user.toJSON() });
  } catch (err: any) {
    console.error('Promote user error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
