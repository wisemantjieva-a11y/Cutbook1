-- CutBook — initial schema
-- Paste this whole file into your database's SQL editor (e.g. Neon's "SQL Editor" tab) and run it once.
-- This mirrors prisma/schema.prisma exactly. If you later set up Prisma locally, run
-- `npx prisma db pull` then `npx prisma migrate resolve --applied 0_manual_init` to bring
-- Prisma's migration history in sync with this — full instructions in DEPLOY.md.

-- ── Enums ─────────────────────────────────────────────────────────────────
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SHOP_OWNER', 'BARBER', 'CUSTOMER');
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ── User ──────────────────────────────────────────────────────────────────
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT UNIQUE,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Shop ──────────────────────────────────────────────────────────────────
CREATE TABLE "Shop" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id"),
  "name" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "phone" TEXT NOT NULL,
  "whatsapp" TEXT,
  "logoUrl" TEXT,
  "coverUrl" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── BarberProfile ─────────────────────────────────────────────────────────
CREATE TABLE "BarberProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "shopId" TEXT REFERENCES "Shop"("id") ON DELETE SET NULL,
  "bio" TEXT,
  "photoUrl" TEXT,
  "skills" TEXT[] NOT NULL DEFAULT '{}',
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "isMobile" BOOLEAN NOT NULL DEFAULT false,
  "baseLatitude" DOUBLE PRECISION,
  "baseLongitude" DOUBLE PRECISION,
  "travelRadiusKm" INTEGER DEFAULT 10,
  "houseCallFeeInCents" INTEGER NOT NULL DEFAULT 0,
  "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "BarberProfile_shopId_idx" ON "BarberProfile"("shopId");
CREATE INDEX "BarberProfile_isMobile_idx" ON "BarberProfile"("isMobile");

-- ── Service ───────────────────────────────────────────────────────────────
CREATE TABLE "Service" (
  "id" TEXT PRIMARY KEY,
  "shopId" TEXT REFERENCES "Shop"("id") ON DELETE CASCADE,
  "barberId" TEXT REFERENCES "BarberProfile"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceInCents" INTEGER NOT NULL,
  "durationMin" INTEGER NOT NULL,
  "allowsHouseCall" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX "Service_shopId_idx" ON "Service"("shopId");
CREATE INDEX "Service_barberId_idx" ON "Service"("barberId");

-- ── ShopJoinRequest ───────────────────────────────────────────────────────
CREATE TABLE "ShopJoinRequest" (
  "id" TEXT PRIMARY KEY,
  "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
  "barberId" TEXT NOT NULL REFERENCES "BarberProfile"("id") ON DELETE CASCADE,
  "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("shopId", "barberId", "status")
);

-- ── AvailabilityHour ──────────────────────────────────────────────────────
CREATE TABLE "AvailabilityHour" (
  "id" TEXT PRIMARY KEY,
  "shopId" TEXT REFERENCES "Shop"("id") ON DELETE CASCADE,
  "barberId" TEXT REFERENCES "BarberProfile"("id") ON DELETE CASCADE,
  "dayOfWeek" INTEGER NOT NULL,
  "openTime" TEXT NOT NULL,
  "closeTime" TEXT NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "shop_day" UNIQUE ("shopId", "dayOfWeek"),
  CONSTRAINT "barber_day" UNIQUE ("barberId", "dayOfWeek")
);

-- ── Appointment ───────────────────────────────────────────────────────────
CREATE TABLE "Appointment" (
  "id" TEXT PRIMARY KEY,
  "customerId" TEXT NOT NULL REFERENCES "User"("id"),
  "barberId" TEXT NOT NULL REFERENCES "BarberProfile"("id"),
  "serviceId" TEXT NOT NULL REFERENCES "Service"("id"),
  "shopId" TEXT REFERENCES "Shop"("id"),
  "isHouseCall" BOOLEAN NOT NULL DEFAULT false,
  "houseCallAddress" TEXT,
  "houseCallLat" DOUBLE PRECISION,
  "houseCallLng" DOUBLE PRECISION,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
  "totalPriceInCents" INTEGER NOT NULL,
  "tipInCents" INTEGER NOT NULL DEFAULT 0,
  "smsReminderSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");
CREATE INDEX "Appointment_barberId_idx" ON "Appointment"("barberId");
CREATE INDEX "Appointment_shopId_idx" ON "Appointment"("shopId");

-- ── Payment ───────────────────────────────────────────────────────────────
CREATE TABLE "Payment" (
  "id" TEXT PRIMARY KEY,
  "appointmentId" TEXT NOT NULL UNIQUE REFERENCES "Appointment"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL DEFAULT 'stripe',
  "providerRef" TEXT,
  "amountInCents" INTEGER NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Review ────────────────────────────────────────────────────────────────
CREATE TABLE "Review" (
  "id" TEXT PRIMARY KEY,
  "appointmentId" TEXT NOT NULL UNIQUE REFERENCES "Appointment"("id") ON DELETE CASCADE,
  "authorId" TEXT NOT NULL REFERENCES "User"("id"),
  "barberId" TEXT NOT NULL REFERENCES "BarberProfile"("id"),
  "shopId" TEXT REFERENCES "Shop"("id"),
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
