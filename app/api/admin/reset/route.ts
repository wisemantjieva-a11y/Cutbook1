import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { email, adminEmail } = await req.json()
    const expectedAdmin = process.env.ADMIN_EMAIL
    if (!adminEmail || !expectedAdmin || adminEmail.toLowerCase() !== expectedAdmin.toLowerCase()) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    if (!email) {
      return NextResponse.json({ success: false, message: 'email required' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({
      where: { email },
      include: { barberProfile: true, shops: true }
    })
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }
    // Delete shops (cascade will handle related records via FK)
    for (const shop of user.shops) {
      await prisma.shop.delete({ where: { id: shop.id } })
    }
    // Delete barber profile
    if (user.barberProfile) {
      await prisma.barberProfile.delete({ where: { userId: user.id } })
    }
    await prisma.user.delete({ where: { email } })
    return NextResponse.json({ success: true, message: 'Deleted user ' + email })
  } catch (err: any) {
    console.error('reset error', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
