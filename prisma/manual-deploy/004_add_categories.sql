-- CutBook — add barbershop/salon category tagging
-- You already ran 001 and 003 on your live database. Paste and run this file next — it only
-- adds what's new (a category on shops and stylists, defaulting everyone to 'BARBERSHOP' so
-- nothing changes for existing listings until you or a shop owner sets it to Salon or Both).

CREATE TYPE "BusinessCategory" AS ENUM ('BARBERSHOP', 'SALON', 'BOTH');

ALTER TABLE "Shop" ADD COLUMN "category" "BusinessCategory" NOT NULL DEFAULT 'BARBERSHOP';
ALTER TABLE "BarberProfile" ADD COLUMN "category" "BusinessCategory" NOT NULL DEFAULT 'BARBERSHOP';

-- Nothing else to backfill — the DEFAULT above already applied 'BARBERSHOP' to every existing
-- row. Shop owners can change their own category to Salon or Both from Settings in the app,
-- or you can set specific ones here, e.g.:
-- UPDATE "Shop" SET "category" = 'SALON' WHERE "id" = 'the-shop-id-here';
