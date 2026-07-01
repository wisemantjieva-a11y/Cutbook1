import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSms, bookingReminderSms } from '@/lib/sms'

const REMINDER_WINDOW_MINUTES = 60 // send a reminder for anything starting within the next hour

// GET /api/cron/reminders
// Intended to be hit by a scheduler (Vercel Cron, cron-job.org, etc.) every ~15 min.
// Vercel automatically sends `Authorization: Bearer $CRON_SECRET` for cron-triggered
// requests when CRON_SECRET is set in the project's env vars.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60000)

  const due = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      smsReminderSentAt: null,
      startTime: { gte: now, lte: windowEnd },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      service: { select: { name: true } },
      barber: { include: { user: { select: { name: true } } } },
    },
  })

  let sent = 0
  for (const appt of due) {
    const result = await sendSms(
      appt.customer.phone || '',
      bookingReminderSms({
        serviceName: appt.service.name,
        barberName: appt.barber.user.name,
        when: appt.startTime.toLocaleString('en-NA', { dateStyle: 'medium', timeStyle: 'short' }),
      })
    )
    if (result.ok) {
      await prisma.appointment.update({ where: { id: appt.id }, data: { smsReminderSentAt: new Date() } })
      sent++
    }
  }

  return NextResponse.json({ success: true, data: { checked: due.length, sent } })
}
