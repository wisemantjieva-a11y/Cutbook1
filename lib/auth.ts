import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET as string
const COOKIE_NAME = 'cutbook_session'
const SESSION_DAYS = 30

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

export type SessionPayload = {
  userId: string
  role: 'ADMIN' | 'SHOP_OWNER' | 'BARBER' | 'CUSTOMER'
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET || 'dev_only_insecure_secret', {
    expiresIn: `${SESSION_DAYS}d`,
  })
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET || 'dev_only_insecure_secret') as SessionPayload
  } catch {
    return null
  }
}

export function sessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME

/** Reads the session cookie off an incoming API route request and loads the user. */
export async function getSessionUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = verifySession(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      barberProfile: { select: { id: true, shopId: true } },
      shops: { select: { id: true } },
    },
  })
  return user
}

export function requireRole(user: { role: string } | null, roles: string[]) {
  if (!user) return false
  return roles.includes(user.role)
}
