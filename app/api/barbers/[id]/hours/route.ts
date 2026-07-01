import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const hours = await prisma.availabilityHour.findMany({ where: { barberId: params.id }, orderBy: { dayOfWeek: 'asc' } })
  return NextResponse.json({ success: true, data: hours })
}

// PUT /api/barbers/:id/hours  { hours: [{ dayOfWeek, openTime, closeTime, isClosed }, ...] }
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req)
  const barber = await prisma.barberProfile.findUnique({ where: { id: params.id } })
  if (!barber) return NextResponse.json({ success: false, message: 'Barber not found' }, { status: 404 })
  if (!user || (user.id !== barber.userId && user.role !== 'ADMIN')) {
    return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
  }

  const { hours } = await req.json()
  if (!Array.isArray(hours)) {
    return NextResponse.json({ success: false, message: 'hours must be an array' }, { status: 400 })
  }

  const results = await prisma.$transaction(
    hours.map((h: any) =>
      prisma.availabilityHour.upsert({
        where: { barber_day: { barberId: params.id, dayOfWeek: h.dayOfWeek } },
        update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: Boolean(h.isClosed) },
        create: { barberId: params.id, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: Boolean(h.isClosed) },
      })
    )
  )

  return NextResponse.json({ success: true, data: results })
}
