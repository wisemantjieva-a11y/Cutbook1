import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getSessionUser(req)
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { action, suspendReason } = await req.json()

  const now = new Date()

  if (action === 'approve') {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        status: 'ACTIVE',
        approvedAt: now,
        subscriptionStatus: 'PAID',
        subscriptionPaidUntil: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
      },
    })
    return NextResponse.json({ success: true, data: updated })
  }

  if (action === 'suspend') {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: now,
        suspendReason: suspendReason || 'Suspended by admin',
      },
    })
    return NextResponse.json({ success: true, data: updated })
  }

  if (action === 'mark_paid') {
    const user = await prisma.user.findUnique({ where: { id: params.id } })
    if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    const base = user.subscriptionPaidUntil && user.subscriptionPaidUntil > now
      ? user.subscriptionPaidUntil
      : now
    const nextPaidUntil = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate())
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        subscriptionStatus: 'PAID',
        subscriptionPaidUntil: nextPaidUntil,
        status: user.status === 'SUSPENDED' && user.suspendReason?.includes('payment') ? 'ACTIVE' : user.status,
      },
    })
    return NextResponse.json({ success: true, data: updated })
  }

  if (action === 'reactivate') {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { status: 'ACTIVE', suspendedAt: null, suspendReason: null },
    })
    return NextResponse.json({ success: true, data: updated })
  }

  return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
}
