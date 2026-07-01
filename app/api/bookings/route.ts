import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { sendSms, bookingConfirmationSms } from '@/lib/sms'
import { getEffectiveHours } from '@/lib/availability'

// POST /api/bookings
// body: { barberId, serviceId, startTime (ISO), isHouseCall, houseCallAddress, houseCallLat, houseCallLng, paymentMethod: 'online' | 'cash' }
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) {
    return NextResponse.json({ success: false, message: 'Login required to book' }, { status: 401 })
  }

  const body = await req.json()
  const { barberId, serviceId, startTime, isHouseCall, houseCallAddress, houseCallLat, houseCallLng, paymentMethod } = body

  if (!barberId || !serviceId || !startTime) {
    return NextResponse.json({ success: false, message: 'barberId, serviceId, startTime are required' }, { status: 400 })
  }

  const [barber, service] = await Promise.all([
    prisma.barberProfile.findUnique({ where: { id: barberId } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ])

  if (!barber) return NextResponse.json({ success: false, message: 'Barber not found' }, { status: 404 })
  if (!service) return NextResponse.json({ success: false, message: 'Service not found' }, { status: 404 })

  const wantsHouseCall = Boolean(isHouseCall)
  if (wantsHouseCall) {
    if (!barber.isMobile) {
      return NextResponse.json({ success: false, message: 'This barber does not offer house calls' }, { status: 400 })
    }
    if (!service.allowsHouseCall) {
      return NextResponse.json({ success: false, message: 'This service is not available as a house call' }, { status: 400 })
    }
    if (!houseCallAddress) {
      return NextResponse.json({ success: false, message: 'houseCallAddress is required for house calls' }, { status: 400 })
    }
  }

  const start = new Date(startTime)
  if (isNaN(start.getTime()) || start < new Date()) {
    return NextResponse.json({ success: false, message: 'startTime must be a valid future date' }, { status: 400 })
  }
  const end = new Date(start.getTime() + service.durationMin * 60000)

  // Reject times outside business hours
  const hours = await getEffectiveHours(barberId, start.getDay())
  if (hours.isClosed) {
    return NextResponse.json({ success: false, message: 'Closed on that day' }, { status: 400 })
  }
  const [openH, openM] = hours.openTime.split(':').map(Number)
  const [closeH, closeM] = hours.closeTime.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = startMinutes + service.durationMin
  if (startMinutes < openMinutes || endMinutes > closeMinutes) {
    return NextResponse.json(
      { success: false, message: `Outside business hours (${hours.openTime}–${hours.closeTime})` },
      { status: 400 }
    )
  }

  // Prevent double-booking: check overlap for this barber
  const overlap = await prisma.appointment.findFirst({
    where: {
      barberId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
    },
  })
  if (overlap) {
    return NextResponse.json({ success: false, message: 'That time slot is no longer available' }, { status: 409 })
  }

  const totalPriceInCents = service.priceInCents + (wantsHouseCall ? barber.houseCallFeeInCents : 0)
  const isCash = paymentMethod === 'cash'

  const appointment = await prisma.appointment.create({
    data: {
      customerId: user.id,
      barberId,
      serviceId,
      shopId: barber.shopId,
      isHouseCall: wantsHouseCall,
      houseCallAddress: wantsHouseCall ? houseCallAddress : null,
      houseCallLat: wantsHouseCall ? houseCallLat ?? null : null,
      houseCallLng: wantsHouseCall ? houseCallLng ?? null : null,
      startTime: start,
      endTime: end,
      status: isCash ? 'CONFIRMED' : 'PENDING',
      totalPriceInCents,
      payment: {
        create: {
          provider: isCash ? 'cash' : 'stripe',
          amountInCents: totalPriceInCents,
          status: 'PENDING',
        },
      },
    },
    include: { service: true, barber: { include: { user: true } }, customer: true },
  })

  if (isCash) {
    // Cash bookings are confirmed immediately; notify the customer now.
    await sendSms(
      user.phone || '',
      bookingConfirmationSms({
        customerName: user.name,
        serviceName: service.name,
        barberName: appointment.barber.user.name,
        when: start.toLocaleString('en-NA', { dateStyle: 'medium', timeStyle: 'short' }),
        isHouseCall: wantsHouseCall,
      })
    )
  }
  // For online payments, confirmation SMS is sent by the Stripe webhook once payment succeeds.

  return NextResponse.json({ success: true, data: appointment }, { status: 201 })
}

// GET /api/bookings — bookings relevant to the logged-in user (as customer, barber, or shop owner)
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ success: false, message: 'Login required' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'auto' // 'customer' | 'barber' | 'shop' | 'auto'

  let where: any = {}
  if (scope === 'customer' || (scope === 'auto' && user.role === 'CUSTOMER')) {
    where = { customerId: user.id }
  } else if (user.barberProfile && (scope === 'barber' || scope === 'auto')) {
    where = { barberId: user.barberProfile.id }
  } else if (scope === 'shop' || (scope === 'auto' && user.shops?.length)) {
    const shopIds = user.shops.map((s) => s.id)
    where = { shopId: { in: shopIds } }
  } else {
    where = { customerId: user.id }
  }

  const bookings = await prisma.appointment.findMany({
    where,
    include: {
      service: true,
      barber: { include: { user: { select: { name: true, phone: true } } } },
      customer: { select: { name: true, phone: true } },
      payment: true,
      review: true,
    },
    orderBy: { startTime: 'asc' },
  })

  return NextResponse.json({ success: true, data: bookings })
}
