import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/services  { shopId? , barberId?, name, priceInCents, durationMin, allowsHouseCall }
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ success: false, message: 'Login required' }, { status: 401 })

  const body = await req.json()
  const { shopId, barberId, name, description, priceInCents, durationMin, allowsHouseCall } = body

  if (!name || !priceInCents || !durationMin) {
    return NextResponse.json({ success: false, message: 'name, priceInCents, durationMin are required' }, { status: 400 })
  }
  if (!shopId && !barberId) {
    return NextResponse.json({ success: false, message: 'Provide shopId or barberId' }, { status: 400 })
  }

  if (shopId) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } })
    if (!shop || (shop.ownerId !== user.id && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Not authorized for this shop' }, { status: 403 })
    }
  }
  if (barberId) {
    const barber = await prisma.barberProfile.findUnique({ where: { id: barberId } })
    if (!barber || (barber.userId !== user.id && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Not authorized for this barber profile' }, { status: 403 })
    }
  }

  const service = await prisma.service.create({
    data: {
      shopId: shopId || null,
      barberId: barberId || null,
      name,
      description: description || null,
      priceInCents,
      durationMin,
      allowsHouseCall: Boolean(allowsHouseCall),
    },
  })

  return NextResponse.json({ success: true, data: service }, { status: 201 })
}
