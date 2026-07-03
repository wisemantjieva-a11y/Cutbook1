import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || !user.barberProfile) {
    return NextResponse.json({ success: false, message: 'Barber login required' }, { status: 401 })
  }

  const requests = await prisma.shopJoinRequest.findMany({
    where: { barberId: user.barberProfile.id },
    include: { shop: { select: { id: true, name: true, area: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: requests })
}
