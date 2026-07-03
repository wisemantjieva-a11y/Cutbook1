import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { constructWebhookEvent } from '@/lib/payments'
import { sendSms, bookingConfirmationSms } from '@/lib/sms'

export const dynamic = 'force-dynamic'

// Stripe requires the raw body for signature verification, so this route
// must not run through any body-parsing middleware.
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  if (!signature) {
    return NextResponse.json({ success: false, message: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event
  try {
    event = constructWebhookEvent(rawBody, signature)
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const appointmentId = session.metadata?.appointmentId
    if (appointmentId) {
      const appointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CONFIRMED' },
        include: { service: true, customer: true, barber: { include: { user: true } } },
      })
      await prisma.payment.update({
        where: { appointmentId },
        data: { status: 'PAID', providerRef: session.id },
      })

      await sendSms(
        appointment.customer.phone || '',
        bookingConfirmationSms({
          customerName: appointment.customer.name,
          serviceName: appointment.service.name,
          barberName: appointment.barber.user.name,
          when: new Date(appointment.startTime).toLocaleString('en-NA', { dateStyle: 'medium', timeStyle: 'short' }),
          isHouseCall: appointment.isHouseCall,
        })
      )
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as any
    const appointmentId = session.metadata?.appointmentId
    if (appointmentId) {
      await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'CANCELED' } })
      await prisma.payment.update({ where: { appointmentId }, data: { status: 'FAILED' } })
    }
  }

  return NextResponse.json({ received: true })
}
