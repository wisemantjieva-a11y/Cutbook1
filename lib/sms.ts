/**
 * Thin wrapper around Africa's Talking SMS API.
 * Requires AT_API_KEY + AT_USERNAME in env. In development without real
 * credentials, messages are logged instead of sent so the rest of the
 * booking flow still works.
 */

const AT_API_KEY = process.env.AT_API_KEY
const AT_USERNAME = process.env.AT_USERNAME
const AT_SENDER_ID = process.env.AT_SENDER_ID || 'CutBook'

const LIVE = Boolean(AT_API_KEY && AT_USERNAME && AT_USERNAME !== 'sandbox_missing')

export async function sendSms(to: string, message: string) {
  if (!to) return { ok: false, reason: 'missing_phone' }

  if (!AT_API_KEY || !AT_USERNAME) {
    console.log(`[sms:dev-mode] to=${to} message="${message}"`)
    return { ok: true, dev: true }
  }

  try {
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey: AT_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        username: AT_USERNAME,
        to,
        message,
        from: AT_SENDER_ID,
      }),
    })
    const data = await res.json()
    return { ok: res.ok, data }
  } catch (err) {
    console.error('SMS send failed', err)
    return { ok: false, error: String(err) }
  }
}

export function bookingConfirmationSms(opts: {
  customerName: string
  serviceName: string
  barberName: string
  when: string
  isHouseCall: boolean
}) {
  const where = opts.isHouseCall ? 'at your address' : 'at the shop'
  return `Hi ${opts.customerName}, your ${opts.serviceName} with ${opts.barberName} is confirmed for ${opts.when} ${where}. Reply CANCEL to cancel. - CutBook`
}

export function bookingReminderSms(opts: { serviceName: string; barberName: string; when: string }) {
  return `Reminder: your ${opts.serviceName} with ${opts.barberName} is coming up at ${opts.when}. - CutBook`
}
