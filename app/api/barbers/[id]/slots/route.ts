import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableSlots } from '@/lib/availability'

export const dynamic = 'force-dynamic'

// GET /api/barbers/:id/slots?date=YYYY-MM-DD&serviceId=xxx
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const serviceId = searchParams.get('serviceId')

  if (!date) return NextResponse.json({ success: false, message: 'date is required (YYYY-MM-DD)' }, { status: 400 })
  if (!serviceId) return NextResponse.json({ success: false, message: 'serviceId is required' }, { status: 400 })

  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) return NextResponse.json({ success: false, message: 'Service not found' }, { status: 404 })

  try {
    const slots = await getAvailableSlots({ barberId: params.id, date, durationMin: service.durationMin })
    return NextResponse.json({ success: true, data: slots })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to compute availability' }, { status: 400 })
  }
}
