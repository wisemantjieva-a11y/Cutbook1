import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/shops/:id/join-requests  { message? }  — must be logged in as a barber
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req)
  if (!user || !user.barberProfile) {
    return NextResponse.json({ success: false, message: 'Only barbers can request to join a shop' }, { status: 403 })
  }
  if (user.barberProfile.shopId) {
    return NextResponse.json({ success: false, message: 'You already belong to a shop' }, { status: 400 })
  }

  const shop = await prisma.shop.findUnique({ where: { id: params.id } })
  if (!shop) return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 })

  const { message } = await req.json().catch(() => ({ message: undefined }))

  const existing = await prisma.shopJoinRequest.findFirst({
    where: { shopId: params.id, barberId: user.barberProfile.id, status: 'PENDING' },
  })
  if (existing) {
    return NextResponse.json({ success: false, message: 'You already have a pending request for this shop' }, { status: 409 })
  }

  const request = await prisma.shopJoinRequest.create({
    data: { shopId: params.id, barberId: user.barberProfile.id, message: message || null },
  })

  return NextResponse.json({ success: true, data: request }, { status: 201 })
}

// GET /api/shops/:id/join-requests — shop owner views pending requests
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req)
  const shop = await prisma.shop.findUnique({ where: { id: params.id } })
  if (!shop) return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 })
  if (!user || (user.id !== shop.ownerId && user.role !== 'ADMIN')) {
    return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
  }

  const requests = await prisma.shopJoinRequest.findMany({
    where: { shopId: params.id, status: 'PENDING' },
    include: { barber: { include: { user: { select: { name: true, email: true, phone: true } } } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ success: true, data: requests })
}
