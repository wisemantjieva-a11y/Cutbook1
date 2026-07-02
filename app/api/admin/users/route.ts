import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const [users, stats, totalCustomers] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['SHOP_OWNER', 'BARBER'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        status: true, subscriptionStatus: true, subscriptionPaidUntil: true,
        approvedAt: true, suspendedAt: true, suspendReason: true, createdAt: true,
      },
    }),
    prisma.user.groupBy({
      by: ['status', 'role'],
      where: { role: { in: ['SHOP_OWNER', 'BARBER'] } },
      _count: true,
    }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
  ])

  const summary = {
    totalBarbers: 0, activeBarbers: 0, pendingBarbers: 0, suspendedBarbers: 0,
    totalShopOwners: 0, activeShopOwners: 0, pendingShopOwners: 0, suspendedShopOwners: 0,
    totalCustomers,
  }

  for (const row of stats) {
    const count = row._count
    if (row.role === 'BARBER') {
      summary.totalBarbers += count
      if (row.status === 'ACTIVE') summary.activeBarbers += count
      if (row.status === 'PENDING') summary.pendingBarbers += count
      if (row.status === 'SUSPENDED') summary.suspendedBarbers += count
    }
    if (row.role === 'SHOP_OWNER') {
      summary.totalShopOwners += count
      if (row.status === 'ACTIVE') summary.activeShopOwners += count
      if (row.status === 'PENDING') summary.pendingShopOwners += count
      if (row.status === 'SUSPENDED') summary.suspendedShopOwners += count
    }
  }

  return NextResponse.json({ success: true, data: { users, summary } })
}
