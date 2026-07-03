import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const hours = await prisma.availabilityHour.findMany({ where: { shopId: params.id }, orderBy: { dayOfWeek: 'asc' } })
  return NextResponse.json({ success: true, data: hours })
}

// PUT /api/shops/:id/hours  { hours: [{ dayOfWeek, openTime, closeTime, isClosed }, ...] }
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req)
  const shop = await prisma.shop.findUnique({ where: { id: params.id } })
  if (!shop) return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 })
  if (!user || (user.id !== shop.ownerId && user.role !== 'ADMIN')) {
    return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
  }

  const { hours } = await req.json()
  if (!Array.isArray(hours)) {
    return NextResponse.json({ success: false, message: 'hours must be an array' }, { status: 400 })
  }

  const results = await prisma.$transaction(
    hours.map((h: any) =>
      prisma.availabilityHour.upsert({
        where: { shop_day: { shopId: params.id, dayOfWeek: h.dayOfWeek } },
        update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: Boolean(h.isClosed) },
        create: { shopId: params.id, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: Boolean(h.isClosed) },
      })
    )
  )

  return NextResponse.json({ success: true, data: results })
}
