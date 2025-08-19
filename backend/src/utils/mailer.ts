import nodemailer from 'nodemailer'

const host = process.env.SMTP_HOST || 'smtp.gmail.com'
const port = Number(process.env.SMTP_PORT || 465)
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS

if (!user || !pass) {
  // Don't throw at import time in case of non-email flows, but warn.
  // eslint-disable-next-line no-console
  console.warn('SMTP_USER/SMTP_PASS not set. OTP emails will fail until configured.')
}

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true for 465, false for other ports
  auth: user && pass ? { user, pass } : undefined,
})

export async function sendOtpEmail(to: string, code: string, purpose: 'signup' | 'login') {
  const appName = process.env.APP_NAME || 'Electronics Repair'
  const subject = `${appName} ${purpose === 'signup' ? 'Signup' : 'Login'} OTP`
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
      <p>Use the following OTP to ${purpose === 'signup' ? 'complete your registration' : 'sign in'}:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:3px">${code}</p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
      <p>— ${appName}</p>
    </div>
  `
  await transporter.sendMail({
    from: user || 'no-reply@example.com',
    to,
    subject,
    html,
  })
}

export function generateOtp(): string {
  return ('' + Math.floor(100000 + Math.random() * 900000))
}
