import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const ALLOWED_METHODS = ['cash', 'eft', 'whatsapp', 'other']

// POST /api/admin/subscriptions/:id/payments  { amountInCents, method, note? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
  }

  const sub = await prisma.platformSubscription.findUnique({ where: { id: params.id } })
  if (!sub) return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: 404 })

  const { amountInCents, method, note } = await req.json()
  if (typeof amountInCents !== 'number' || amountInCents <= 0) {
    return NextResponse.json({ success: false, message: 'amountInCents must be a positive number' }, { status: 400 })
  }
  if (!ALLOWED_METHODS.includes(method)) {
    return NextResponse.json({ success: false, message: `method must be one of ${ALLOWED_METHODS.join(', ')}` }, { status: 400 })
  }

  const now = new Date()
  // Extend from whichever is later: now, or the current paid-through date (so early
  // payments stack on top of remaining time instead of shortening it).
  const base = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now
  const newPeriodEnd = new Date(base)
  newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)

  const [payment, updatedSub] = await prisma.$transaction([
    prisma.subscriptionPayment.create({
      data: { subscriptionId: params.id, amountInCents, method, note: note || null, recordedById: user.id },
    }),
    prisma.platformSubscription.update({
      where: { id: params.id },
      data: { status: 'ACTIVE', currentPeriodEnd: newPeriodEnd },
    }),
  ])

  return NextResponse.json({ success: true, data: { payment, subscription: updatedSub } }, { status: 201 })
}
