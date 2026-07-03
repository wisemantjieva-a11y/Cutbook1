import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, signSession, sessionCookieOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'email and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 })
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      }, { status: 403 })
    }

    const token = signSession({ userId: user.id, role: user.role as any, status: user.status as any })
    const res = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    })
    res.cookies.set(sessionCookieOptions().name, token, sessionCookieOptions())
    return res
  } catch (err) {
    console.error('login error', err)
    return NextResponse.json({ success: false, message: 'Login failed' }, { status: 500 })
  }
}
