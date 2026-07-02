import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const barber = await prisma.barberProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, phone: true } },
      shop: true,
      services: { where: { isActive: true } },
      hours: true,
      reviews: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!barber) return NextResponse.json({ success: false, message: 'Barber not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: barber })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req)
  const barber = await prisma.barberProfile.findUnique({ where: { id: params.id } })
  if (!barber) return NextResponse.json({ success: false, message: 'Barber not found' }, { status: 404 })

  if (!user || (user.id !== barber.userId && user.role !== 'ADMIN')) {
    return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
  }

  const body = await req.json()
  const allowed = [
    'bio', 'skills', 'isAvailable', 'isMobile',
    'baseLatitude', 'baseLongitude', 'travelRadiusKm', 'houseCallFeeInCents', 'shopId',
  ]
  const data: Record<string, any> = {}
  for (const key of allowed) if (key in body) data[key] = body[key]

  const updated = await prisma.barberProfile.update({ where: { id: params.id }, data })
  return NextResponse.json({ success: true, data: updated })
}
