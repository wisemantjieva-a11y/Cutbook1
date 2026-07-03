import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const user = await getSessionUser(req)
    if (!user || user.role !== 'ADMIN') {
          return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }

  const subscriptions = await prisma.platformSubscription.findMany({
        include: {
                shop: { select: { id: true, name: true, area: true, owner: { select: { name: true, phone: true, email: true } } } },
                barber: { select: { id: true, user: { select: { name: true, phone: true, email: true } } } },
                payments: { orderBy: { paidAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ success: true, data: subscriptions })
}
