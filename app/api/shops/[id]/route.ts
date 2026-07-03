import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const shop = await prisma.shop.findUnique({
    where: { id: params.id },
    include: {
      barbers: {
        include: { user: { select: { name: true } } },
      },
      services: { where: { isActive: true } },
      hours: true,
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { author: { select: { name: true } } },
      },
    },
  })

  if (!shop) {
    return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: shop })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req)
  const shop = await prisma.shop.findUnique({ where: { id: params.id } })
  if (!shop) return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 })

  if (!user || (user.id !== shop.ownerId && user.role !== 'ADMIN')) {
    return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
  }

  const body = await req.json()
  const allowed = ['name', 'area', 'address', 'phone', 'whatsapp', 'description', 'logoUrl', 'coverUrl', 'isActive', 'latitude', 'longitude']
  const data: Record<string, any> = {}
  for (const key of allowed) if (key in body) data[key] = body[key]

  const updated = await prisma.shop.update({ where: { id: params.id }, data })
  return NextResponse.json({ success: true, data: updated })
}
