import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signSession, sessionCookieOptions } from '@/lib/auth'

const allowedRoles = ['SHOP_OWNER', 'BARBER', 'CUSTOMER'] as const
type AllowedRole = typeof allowedRoles[number]

export async function POST(req: NextRequest) {
  try {
    const { email, phone, name, password, role, isMobileBarber } = await req.json()

    if (!email || !name || !password) {
      return NextResponse.json({ success: false, message: 'email, name, and password are required' }, { status: 400 })
    }

    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin = adminEmail && email.toLowerCase() === adminEmail.toLowerCase()

    let finalRole: AllowedRole | 'ADMIN' = isAdmin
      ? 'ADMIN'
      : allowedRoles.includes(role as AllowedRole)
      ? (role as AllowedRole)
      : 'CUSTOMER'

    // SHOP_OWNER and BARBER start as PENDING (need admin approval)
    // CUSTOMER and ADMIN start as ACTIVE
    const status = (finalRole === 'SHOP_OWNER' || finalRole === 'BARBER') ? 'PENDING' : 'ACTIVE'
    const subscriptionStatus = (finalRole === 'SHOP_OWNER' || finalRole === 'BARBER') ? 'UNPAID' : 'NONE'

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        phone: phone || null,
        name,
        passwordHash,
        role: finalRole as any,
        status: status as any,
        subscriptionStatus: subscriptionStatus as any,
      },
    })

    if (finalRole === 'BARBER') {
      await prisma.barberProfile.create({
        data: {
          userId: user.id,
          isMobileBarber: isMobileBarber === true,
        },
      })
    }

    const token = signSession({ userId: user.id, role: finalRole as any, status: status as any })
    const res = NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
    }, { status: 201 })
    res.cookies.set(sessionCookieOptions().name, token, sessionCookieOptions())
    return res
  } catch (err: any) {
    console.error('register error', err)
    if (err.code === 'P2002') {
      return NextResponse.json({ success: false, message: 'An account with that email or phone already exists' }, { status: 409 })
    }
    return NextResponse.json({ success: false, message: 'Registration failed' }, { status: 500 })
  }
}
