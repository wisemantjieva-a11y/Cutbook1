import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const ALLOWED_STATUSES = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getSessionUser(req)
    if (!user || user.role !== 'ADMIN') {
          return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }

  const { monthlyFeeInCents, status } = await req.json()
    const data: Record<string, any> = {}
        if (typeof monthlyFeeInCents === 'number') data.monthlyFeeInCents = monthlyFeeInCents
    if (status) {
          if (!ALLOWED_STATUSES.includes(status)) {
                  return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 })
          }
          data.status = status
    }

  const updated = await prisma.platformSubscription.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, data: updated })
}
