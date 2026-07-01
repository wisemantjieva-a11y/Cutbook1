import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  await prisma.review.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.shopJoinRequest.deleteMany()
  await prisma.availabilityHour.deleteMany()
  await prisma.service.deleteMany()
  await prisma.barberProfile.deleteMany()
  await prisma.shop.deleteMany()
  await prisma.user.deleteMany()

  const pw = await bcrypt.hash('password123', 10)

  await prisma.user.create({
    data: { email: 'admin@cutbook.com', name: 'CutBook Admin', passwordHash: pw, role: 'ADMIN' },
  })

  // ── Shop owner + shop ────────────────────────────────────────────────────
  const ownerUser = await prisma.user.create({
    data: { email: 'owner@classiccutz.com', name: 'Classic Cutz Owner', passwordHash: pw, role: 'SHOP_OWNER', phone: '+264811000001' },
  })
  const shop = await prisma.shop.create({
    data: {
      ownerId: ownerUser.id,
      name: 'Classic Cutz',
      area: 'Hakahana',
      address: '8 Sam Nujoma Dr',
      phone: '+264814567890',
      description: 'Fades, beard sculpting, and full grooms in the heart of Hakahana.',
      latitude: -22.5514,
      longitude: 17.0908,
    },
  })

  await prisma.$transaction(
    Array.from({ length: 7 }, (_, dayOfWeek) =>
      prisma.availabilityHour.create({
        data: { shopId: shop.id, dayOfWeek, openTime: '08:00', closeTime: '18:00', isClosed: dayOfWeek === 0 },
      })
    )
  )

  // ── Shop-based barbers ───────────────────────────────────────────────────
  const marcusUser = await prisma.user.create({
    data: { email: 'marcus@barber.com', name: 'Marcus V.', passwordHash: pw, role: 'BARBER', phone: '+264811111111' },
  })
  const marcus = await prisma.barberProfile.create({
    data: { userId: marcusUser.id, shopId: shop.id, bio: 'Fade specialist, 8 years experience', skills: ['Skin Fade'], ratingAvg: 4.8, ratingCount: 32 },
  })

  const davidUser = await prisma.user.create({
    data: { email: 'david@barber.com', name: 'David K.', passwordHash: pw, role: 'BARBER', phone: '+264811222222' },
  })
  const david = await prisma.barberProfile.create({
    data: { userId: davidUser.id, shopId: shop.id, bio: 'Beard sculpting and hot towel shaves', skills: ['Beard Sculpt'], ratingAvg: 4.6, ratingCount: 18 },
  })

  const fade = await prisma.service.create({
    data: { shopId: shop.id, name: 'Skin Fade', durationMin: 45, priceInCents: 7000, description: 'Premium mid/high skin fade' },
  })
  const beard = await prisma.service.create({
    data: { shopId: shop.id, name: 'Beard Sculpt & Shave', durationMin: 30, priceInCents: 5000, description: 'Hot towel razor shave' },
  })
  await prisma.service.create({
    data: { shopId: shop.id, name: 'Kids Cut', durationMin: 25, priceInCents: 4000 },
  })

  // ── Freelance / mobile barber (house calls) ─────────────────────────────
  const mosesUser = await prisma.user.create({
    data: { email: 'moses@freelance.com', name: 'Moses N.', passwordHash: pw, role: 'BARBER', phone: '+264811333333' },
  })
  const moses = await prisma.barberProfile.create({
    data: {
      userId: mosesUser.id,
      bio: 'Mobile barber — I bring the chair to you. Windhoek West, Klein Windhoek, Eros.',
      skills: ['Haircut', 'Fade', 'Kids Cut'],
      isMobile: true,
      baseLatitude: -22.5709,
      baseLongitude: 17.0836,
      travelRadiusKm: 15,
      houseCallFeeInCents: 15000,
      ratingAvg: 4.9,
      ratingCount: 12,
    },
  })
  const mosesHaircut = await prisma.service.create({
    data: { barberId: moses.id, name: 'Haircut', durationMin: 40, priceInCents: 8000, allowsHouseCall: true, description: 'Full haircut, house call ready' },
  })
  await prisma.service.create({
    data: { barberId: moses.id, name: 'Kids Cut', durationMin: 25, priceInCents: 5000, allowsHouseCall: true },
  })

  await prisma.$transaction(
    Array.from({ length: 7 }, (_, dayOfWeek) =>
      prisma.availabilityHour.create({
        data: { barberId: moses.id, dayOfWeek, openTime: '09:00', closeTime: '17:00', isClosed: dayOfWeek === 0 },
      })
    )
  )

  // ── A shop-less freelance barber with a pending request to join Classic Cutz ──
  const thomasUser = await prisma.user.create({
    data: { email: 'thomas@freelance.com', name: 'Thomas N.', passwordHash: pw, role: 'BARBER', phone: '+264811444444' },
  })
  const thomas = await prisma.barberProfile.create({
    data: { userId: thomasUser.id, bio: 'Newly freelance, looking for a shop chair', skills: ['Haircut'], isMobile: false },
  })
  await prisma.shopJoinRequest.create({
    data: { shopId: shop.id, barberId: thomas.id, message: 'Hi! I used to cut at Fresh Fadez, would love a chair here.' },
  })

  // ── Customer + sample bookings ──────────────────────────────────────────
  const customer = await prisma.user.create({
    data: { email: 'ndapewa@client.com', name: 'Ndapewa K.', passwordHash: pw, role: 'CUSTOMER', phone: '+264815555555' },
  })

  const today = new Date()
  today.setHours(15, 0, 0, 0)
  const end1 = new Date(today.getTime() + fade.durationMin * 60000)

  await prisma.appointment.create({
    data: {
      customerId: customer.id, barberId: marcus.id, serviceId: fade.id, shopId: shop.id,
      startTime: today, endTime: end1, status: 'CONFIRMED', totalPriceInCents: fade.priceInCents,
      payment: { create: { provider: 'cash', amountInCents: fade.priceInCents, status: 'PENDING' } },
    },
  })

  const houseCallStart = new Date()
  houseCallStart.setDate(houseCallStart.getDate() + 1)
  houseCallStart.setHours(10, 0, 0, 0)
  const houseCallEnd = new Date(houseCallStart.getTime() + mosesHaircut.durationMin * 60000)

  await prisma.appointment.create({
    data: {
      customerId: customer.id, barberId: moses.id, serviceId: mosesHaircut.id,
      isHouseCall: true, houseCallAddress: '12 Sam Nujoma Dr, Klein Windhoek',
      startTime: houseCallStart, endTime: houseCallEnd, status: 'PENDING',
      totalPriceInCents: mosesHaircut.priceInCents + moses.houseCallFeeInCents,
      payment: { create: { provider: 'stripe', amountInCents: mosesHaircut.priceInCents + moses.houseCallFeeInCents, status: 'PENDING' } },
    },
  })

  console.log('🌱 Seeded: 1 shop (with hours), 2 shop barbers, 1 freelance/mobile barber (with hours),')
  console.log('   1 shop-less barber with a pending join request, services, and sample bookings.')
  console.log('   Login as admin@cutbook.com / password123 (admin)')
  console.log('   Login as owner@classiccutz.com / password123 (shop owner — see the pending join request in Settings)')
  console.log('   Login as moses@freelance.com / password123 (freelance/mobile barber)')
  console.log('   Login as thomas@freelance.com / password123 (shop-less barber who can browse & request to join)')
  console.log('   Login as ndapewa@client.com / password123 (customer)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
