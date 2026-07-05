import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/shops?area=Khomasdal&q=fade
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const area = searchParams.get('area')
  const q = searchParams.get('q')

  const shops = await prisma.shop.findMany({
    where: {
      isActive: true,
      ...(area ? { area: { equals: area, mode: 'insensitive' } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      barbers: { select: { id: true, ratingAvg: true, ratingCount: true } },
      services: { where: { isActive: true }, select: { id: true, name: true, priceInCents: true, durationMin: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: shops })
}

// POST /api/shops -- create a shop (must be logged in as SHOP_OWNER)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!requireRole(user, ['SHOP_OWNER', 'ADMIN'])) {
    return NextResponse.json({ success: false, message: 'Only shop owners can create a shop' }, { status: 403 })
  }

  const body = await req.json()
  const { name, area, address, phone, whatsapp, description, latitude, longitude, category } = body
  if (!name || !area || !address || !phone) {
    return NextResponse.json({ success: false, message: 'name, area, address, phone are required' }, { status: 400 })
  }

  const validCategories = ['BARBERSHOP', 'SALON', 'BOTH']
  const shopCategory = validCategories.includes(category) ? category : 'BARBERSHOP'

  const shop = await prisma.shop.create({
    data: {
      ownerId: user!.id,
      name,
      area,
      address,
      phone,
      whatsapp: whatsapp || null,
      description: description || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      category: shopCategory,
    },
  })

  return NextResponse.json({ success: true, data: shop }, { status: 201 })
}
