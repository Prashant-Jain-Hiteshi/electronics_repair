import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'

const APPROVAL_SECRET: Secret = (process.env.APPROVAL_TOKEN_SECRET || process.env.JWT_SECRET || 'change_me_approval_secret') as string

export type ApprovalTokenPayload = {
  approvalId: string
  repairOrderId: string
  customerId: string
}

export function signApprovalToken(payload: ApprovalTokenPayload, expiresIn: string | number = '7d') {
  const options: SignOptions = { expiresIn: expiresIn as any }
  return jwt.sign(payload as any, APPROVAL_SECRET, options)
}

export function verifyApprovalToken(token: string): ApprovalTokenPayload | null {
  try {
    return jwt.verify(token, APPROVAL_SECRET) as any
  } catch {
    return null
  }
}
