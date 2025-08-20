import twilio from 'twilio'

const sid = process.env.TWILIO_ACCOUNT_SID
const token = process.env.TWILIO_AUTH_TOKEN
const from = process.env.TWILIO_FROM_NUMBER // e.g. +15005550006 (trial number)

let client: ReturnType<typeof twilio> | null = null
if (sid && token) {
  try {
    client = twilio(sid, token)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to init Twilio client:', e)
  }
} else {
  // eslint-disable-next-line no-console
  console.warn('TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN not set. SMS sending disabled.')
}

export async function sendOtpSms(toMobile: string, code: string) {
  if (!client || !from) {
    // Dev fallback: pretend sent
    // eslint-disable-next-line no-console
    console.log(`[DEV] OTP ${code} for ${toMobile}`)
    return
  }
  const body = `Your verification code is ${code}. It expires in 10 minutes.`
  await client.messages.create({ to: `+91${toMobile}`, from, body })
}
