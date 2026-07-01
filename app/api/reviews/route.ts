import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// POST /api/reviews  { appointmentId, rating (1-5), comment? }
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ success: false, message: 'Login required' }, { status: 401 })

  const { appointmentId, rating, comment } = await req.json()
  if (!appointmentId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ success: false, message: 'appointmentId and rating (1-5) are required' }, { status: 400 })
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { review: true },
  })
  if (!appointment) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
  if (appointment.customerId !== user.id) {
    return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
  }
  if (appointment.status !== 'COMPLETED') {
    return NextResponse.json({ success: false, message: 'You can only review a completed appointment' }, { status: 400 })
  }
  if (appointment.review) {
    return NextResponse.json({ success: false, message: 'This appointment has already been reviewed' }, { status: 409 })
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        appointmentId,
        authorId: user.id,
        barberId: appointment.barberId,
        shopId: appointment.shopId,
        rating,
        comment: comment || null,
      },
    })

    const barber = await tx.barberProfile.findUnique({ where: { id: appointment.barberId } })
    if (barber) {
      const newCount = barber.ratingCount + 1
      const newAvg = (barber.ratingAvg * barber.ratingCount + rating) / newCount
      await tx.barberProfile.update({
        where: { id: barber.id },
        data: { ratingAvg: newAvg, ratingCount: newCount },
      })
    }

    return created
  })

  return NextResponse.json({ success: true, data: review }, { status: 201 })
}
