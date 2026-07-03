import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signSession, sessionCookieOptions } from '@/lib/auth'
import { endOfCurrentMonth } from '@/lib/subscription'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, phone, name, password, role, isMobileBarber } = body

    if (!email || !name || !password) {
      return NextResponse.json({ success: false, message: 'email, name, and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, message: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ success: false, message: 'An account with that email already exists' }, { status: 409 })
    }

    const allowedRoles = ['CUSTOMER', 'SHOP_OWNER', 'BARBER']
    const finalRole = allowedRoles.includes(role) ? role : 'CUSTOMER'

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        phone: phone || null,
        name,
        passwordHash,
        role: finalRole,
      },
    })

    // Freelance barbers get a BarberProfile immediately (shopId null = freelance/mobile),
    // and their own subscription — a shop-based barber is covered by the shop's instead.
    if (finalRole === 'BARBER') {
      await prisma.barberProfile.create({
        data: {
          userId: user.id,
          isMobile: isMobileBarber !== false, // default true for freelance signup
          skills: [],
          subscription: {
            create: { trialEndsAt: endOfCurrentMonth() },
          },
        },
      })
    }

    const token = signSession({ userId: user.id, role: user.role as any })
    const res = NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
    res.cookies.set(sessionCookieOptions().name, token, sessionCookieOptions())
    return res
  } catch (err) {
    console.error('register error', err)
    return NextResponse.json({ success: false, message: 'Registration failed' }, { status: 500 })
  }
}
