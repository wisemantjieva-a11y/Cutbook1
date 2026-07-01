import { prisma } from './prisma'

const SLOT_GRANULARITY_MIN = 15
const DEFAULT_OPEN = '08:00'
const DEFAULT_CLOSE = '18:00'

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/**
 * Returns the effective business hours for a barber on a given day of week.
 * Priority: the barber's own AvailabilityHour row for that day, else (if
 * shop-based) the shop's hours for that day, else a sensible default so
 * booking still works before anyone has configured hours.
 */
export async function getEffectiveHours(barberId: string, dayOfWeek: number) {
  const barber = await prisma.barberProfile.findUnique({
    where: { id: barberId },
    select: { shopId: true },
  })

  const ownHour = await prisma.availabilityHour.findFirst({
    where: { barberId, dayOfWeek },
  })
  if (ownHour) return ownHour

  if (barber?.shopId) {
    const shopHour = await prisma.availabilityHour.findFirst({
      where: { shopId: barber.shopId, dayOfWeek },
    })
    if (shopHour) return shopHour
  }

  // No hours configured anywhere yet — default to open, matches the old prototype's defaults.
  return { openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, isClosed: false }
}

/**
 * Generates bookable start times (ISO strings) for a barber on a given
 * calendar date, for a service of the given duration, excluding times that
 * overlap existing PENDING/CONFIRMED appointments and times already past.
 */
export async function getAvailableSlots(opts: { barberId: string; date: string; durationMin: number }) {
  const { barberId, date, durationMin } = opts
  const day = new Date(`${date}T00:00:00`)
  if (isNaN(day.getTime())) throw new Error('Invalid date')
  const dayOfWeek = day.getDay()

  const hours = await getEffectiveHours(barberId, dayOfWeek)
  if (hours.isClosed) return []

  const openMin = timeToMinutes(hours.openTime)
  const closeMin = timeToMinutes(hours.closeTime)

  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59`)

  const existing = await prisma.appointment.findMany({
    where: {
      barberId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startTime: { lte: dayEnd },
      endTime: { gte: dayStart },
    },
    select: { startTime: true, endTime: true },
  })

  const now = new Date()
  const slots: string[] = []

  for (let start = openMin; start + durationMin <= closeMin; start += SLOT_GRANULARITY_MIN) {
    const h = Math.floor(start / 60)
    const m = start % 60
    const slotStart = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60000)

    if (slotStart < now) continue

    const overlaps = existing.some((e) => slotStart < e.endTime && slotEnd > e.startTime)
    if (overlaps) continue

    slots.push(slotStart.toISOString())
  }

  return slots
}
