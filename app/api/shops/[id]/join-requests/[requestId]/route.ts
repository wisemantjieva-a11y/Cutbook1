import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PATCH /api/shops/:id/join-requests/:requestId  { decision: 'APPROVED' | 'REJECTED' }
export async function PATCH(req: NextRequest, { params }: { params: { id: string; requestId: string } }) {
  const user = await getSessionUser(req)
  const shop = await prisma.shop.findUnique({ where: { id: params.id } })
  if (!shop) return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 })
  if (!user || (user.id !== shop.ownerId && user.role !== 'ADMIN')) {
    return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
  }

  const { decision } = await req.json()
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return NextResponse.json({ success: false, message: 'decision must be APPROVED or REJECTED' }, { status: 400 })
  }

  const request = await prisma.shopJoinRequest.findUnique({ where: { id: params.requestId } })
  if (!request || request.shopId !== params.id) {
    return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 })
  }
  if (request.status !== 'PENDING') {
    return NextResponse.json({ success: false, message: 'Request already resolved' }, { status: 409 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const req2 = await tx.shopJoinRequest.update({ where: { id: params.requestId }, data: { status: decision } })
    if (decision === 'APPROVED') {
      await tx.barberProfile.update({ where: { id: request.barberId }, data: { shopId: params.id } })
    }
    return req2
  })

  return NextResponse.json({ success: true, data: updated })
}
