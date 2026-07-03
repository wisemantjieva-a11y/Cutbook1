import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { createCheckoutSession, stripeConfigured } from '@/lib/payments'

export const dynamic = 'force-dynamic'

// POST /api/payments/create-intent  { appointmentId }
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ success: false, message: 'Login required' }, { status: 401 })

  if (!stripeConfigured()) {
    return NextResponse.json(
      { success: false, message: 'Payments are not configured yet. Set STRIPE_SECRET_KEY in .env to enable online payment.' },
      { status: 503 }
    )
  }

  const { appointmentId } = await req.json()
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: true, barber: { include: { user: true } }, payment: true },
  })
  if (!appointment) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
  if (appointment.customerId !== user.id) {
    return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
  }
  if (appointment.payment?.status === 'PAID') {
    return NextResponse.json({ success: false, message: 'This booking is already paid' }, { status: 409 })
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const session = await createCheckoutSession({
    appointmentId: appointment.id,
    amountInCents: appointment.totalPriceInCents,
    currency: 'nad',
    description: `${appointment.service.name} with ${appointment.barber.user.name}`,
    customerEmail: user.email,
    successUrl: `${appUrl}/confirmation/${appointment.id}?paid=1`,
    cancelUrl: `${appUrl}/confirmation/${appointment.id}?canceled=1`,
  })

  await prisma.payment.update({
    where: { appointmentId: appointment.id },
    data: { providerRef: session.id },
  })

  return NextResponse.json({ success: true, data: { checkoutUrl: session.url } })
}
