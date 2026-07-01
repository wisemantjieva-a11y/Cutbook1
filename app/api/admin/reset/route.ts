import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
          const { secret, email } = await req.json()
          if (!secret || secret !== process.env.JWT_SECRET) {
                  return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
          }
          if (!email) {
                  return NextResponse.json({ success: false, message: 'email required' }, { status: 400 })
          }
          const user = await prisma.user.findUnique({ where: { email }, include: { barberProfile: true } })
          if (!user) {
                  return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
          }
          if (user.barberProfile) {
                  await prisma.barberProfile.delete({ where: { userId: user.id } })
          }
          await prisma.user.delete({ where: { email } })
          return NextResponse.json({ success: true, message: `Deleted user ${email}` })
    } catch (err) {
          console.error('reset error', err)
          return NextResponse.json({ success: false, message: err.message }, { status: 500 })
    }
}
