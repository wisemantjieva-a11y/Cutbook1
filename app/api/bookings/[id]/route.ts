import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const ALLOWED_STATUSES = ['CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ success: false, message: 'Login required' }, { status: 401 })

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: { barber: true, shop: true },
  })
  if (!appointment) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })

  const isCustomer = appointment.customerId === user.id
  const isBarber = user.barberProfile?.id === appointment.barberId
  const isShopOwner = appointment.shop && user.shops?.some((s) => s.id === appointment.shop!.id)
  const isAdmin = user.role === 'ADMIN'

  if (!isCustomer && !isBarber && !isShopOwner && !isAdmin) {
    return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
  }

  const { status, tipInCents } = await req.json()

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 })
  }
  // customers may only cancel their own booking
  if (isCustomer && !isBarber && !isShopOwner && !isAdmin && status && status !== 'CANCELED') {
    return NextResponse.json({ success: false, message: 'Customers may only cancel a booking' }, { status: 403 })
  }

  const data: Record<string, any> = {}
  if (status) data.status = status
  if (typeof tipInCents === 'number') data.tipInCents = tipInCents

  const updated = await prisma.appointment.update({ where: { id: params.id }, data })
  return NextResponse.json({ success: true, data: updated })
}
