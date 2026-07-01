import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// crude haversine distance in km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// GET /api/barbers?mobileOnly=true&lat=-22.56&lng=17.08
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mobileOnly = searchParams.get('mobileOnly') === 'true'
  const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null
  const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null

  const barbers = await prisma.barberProfile.findMany({
    where: {
      isAvailable: true,
      ...(mobileOnly ? { isMobile: true } : {}),
    },
    include: {
      user: { select: { name: true, phone: true } },
      shop: { select: { id: true, name: true, area: true } },
      services: { where: { isActive: true } },
    },
    orderBy: { ratingAvg: 'desc' },
  })

  let result = barbers.map((b) => ({ ...b, distanceKm: null as number | null }))

  if (lat != null && lng != null) {
    result = result
      .map((b) => {
        if (b.isMobile && b.baseLatitude != null && b.baseLongitude != null) {
          const d = distanceKm(lat, lng, b.baseLatitude, b.baseLongitude)
          return { ...b, distanceKm: d }
        }
        return b
      })
      .filter((b) => {
        if (!b.isMobile) return true
        if (b.distanceKm == null) return true
        return b.travelRadiusKm == null || b.distanceKm <= b.travelRadiusKm
      })
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
  }

  return NextResponse.json({ success: true, data: result })
}
