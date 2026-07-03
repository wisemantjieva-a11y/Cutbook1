import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/dashboard/queue?shopId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get('shopId')
    if (!shopId) {
      return NextResponse.json({ success: false, message: 'shopId query param is required' }, { status: 400 })
    }

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const activeBarbers = await prisma.barberProfile.findMany({
      where: { shopId, isAvailable: true },
      select: { id: true, user: { select: { name: true } } },
    })

    if (activeBarbers.length === 0) {
      return NextResponse.json({
        success: true,
        data: { estimatedWaitMinutes: 0, activeBarberCount: 0, totalPendingAppointments: 0, chairs: [] },
      })
    }

    const activeAppointments = await prisma.appointment.findMany({
      where: {
        shopId,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { service: { select: { duration: true } as any } },
      orderBy: { startTime: 'asc' },
    })

    const barberWorkloads: Record<string, number> = {}
    activeBarbers.forEach((b) => (barberWorkloads[b.id] = 0))

    activeAppointments.forEach((appt) => {
      if (barberWorkloads[appt.barberId] === undefined) return
      const apptEnd = new Date(appt.endTime)
      if (apptEnd > now) {
        const startCalc = new Date(appt.startTime) > now ? new Date(appt.startTime) : now
        const remainingMinutes = Math.max(0, Math.ceil((apptEnd.getTime() - startCalc.getTime()) / 60000))
        barberWorkloads[appt.barberId] += remainingMinutes
      }
    })

    const remainingTimes = Object.values(barberWorkloads)
    const baselineWaitMinutes = Math.min(...remainingTimes)

    const chairs = activeBarbers.map((b) => ({
      barberId: b.id,
      barberName: b.user.name,
      minutesRemaining: barberWorkloads[b.id],
      status: barberWorkloads[b.id] === 0 ? 'Empty / Available' : `Busy (${barberWorkloads[b.id]} mins queue)`,
    }))

    return NextResponse.json({
      success: true,
      data: {
        estimatedWaitMinutes: baselineWaitMinutes,
        activeBarberCount: activeBarbers.length,
        totalPendingAppointments: activeAppointments.length,
        chairs,
      },
    })
  } catch (error) {
    console.error('Queue analytics failure:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
