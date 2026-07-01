import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
  }

  const [shops, barbers, userCount, appointmentCount, pendingJoinRequests] = await Promise.all([
    prisma.shop.findMany({
      include: { owner: { select: { name: true, email: true } }, barbers: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.barberProfile.findMany({
      include: { user: { select: { name: true, email: true } }, shop: { select: { name: true } } },
      orderBy: { ratingCount: 'desc' },
    }),
    prisma.user.count(),
    prisma.appointment.count(),
    prisma.shopJoinRequest.count({ where: { status: 'PENDING' } }),
  ])

  return NextResponse.json({
    success: true,
    data: { shops, barbers, userCount, appointmentCount, pendingJoinRequests },
  })
}
