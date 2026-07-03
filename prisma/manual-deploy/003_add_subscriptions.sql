-- CutBook — add platform subscription tracking
-- You already have a live database, so DO NOT re-run 001_init_schema.sql — it would try to
-- recreate tables that already exist and fail. Paste and run this file instead; it only adds
-- what's new.

CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED');

CREATE TABLE "PlatformSubscription" (
  "id" TEXT PRIMARY KEY,
  "shopId" TEXT UNIQUE REFERENCES "Shop"("id") ON DELETE CASCADE,
  "barberId" TEXT UNIQUE REFERENCES "BarberProfile"("id") ON DELETE CASCADE,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "monthlyFeeInCents" INTEGER NOT NULL DEFAULT 0,
  "trialEndsAt" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SubscriptionPayment" (
  "id" TEXT PRIMARY KEY,
  "subscriptionId" TEXT NOT NULL REFERENCES "PlatformSubscription"("id") ON DELETE CASCADE,
  "amountInCents" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "note" TEXT,
  "recordedById" TEXT NOT NULL REFERENCES "User"("id"),
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backfill: give every existing shop a trialing subscription (running until the end of
-- THIS month) if it doesn't already have one. Safe to re-run — skips shops that already
-- have a subscription row.
INSERT INTO "PlatformSubscription" ("id", "shopId", "trialEndsAt")
SELECT
  'sub_' || s."id",
  s."id",
  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 second')
FROM "Shop" s
WHERE NOT EXISTS (SELECT 1 FROM "PlatformSubscription" ps WHERE ps."shopId" = s."id");

-- Backfill: same for shop-less freelance barbers (barbers who belong to a shop are covered
-- by that shop's subscription instead, so they're intentionally skipped here).
INSERT INTO "PlatformSubscription" ("id", "barberId", "trialEndsAt")
SELECT
  'sub_' || b."id",
  b."id",
  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 second')
FROM "BarberProfile" b
WHERE b."shopId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "PlatformSubscription" ps WHERE ps."barberId" = b."id");

-- Optional: set your actual monthly fees now (edit the amounts, in cents — 30000 = N$300).
-- You can skip this and set fees later from /admin/subscriptions in the app instead.
-- UPDATE "PlatformSubscription" SET "monthlyFeeInCents" = 30000 WHERE "shopId" IS NOT NULL;
-- UPDATE "PlatformSubscription" SET "monthlyFeeInCents" = 15000 WHERE "barberId" IS NOT NULL;
