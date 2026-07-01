-- CutBook — demo seed data
-- Run this AFTER 001_init_schema.sql. Paste into your DB's SQL editor.
-- Every seeded user's password is: password123

-- ── Admin ─────────────────────────────────────────────────────────────────
INSERT INTO "User" ("id", "email", "phone", "name", "passwordHash", "role")
VALUES ('usr_admin', 'admin@cutbook.com', NULL, 'CutBook Admin',
        '$2b$10$/tmPFqtUI4eQVEzlPzhFIu/GenTWXskhqG3gIJck1cwWucWGhNj6K', 'ADMIN');

-- ── Shop owner + shop ────────────────────────────────────────────────────
INSERT INTO "User" ("id", "email", "phone", "name", "passwordHash", "role")
VALUES ('usr_owner', 'owner@classiccutz.com', '+264811000001', 'Classic Cutz Owner',
        '$2b$10$/tmPFqtUI4eQVEzlPzhFIu/GenTWXskhqG3gIJck1cwWucWGhNj6K', 'SHOP_OWNER');

INSERT INTO "Shop" ("id", "ownerId", "name", "area", "address", "phone", "description", "latitude", "longitude")
VALUES ('shop_classiccutz', 'usr_owner', 'Classic Cutz', 'Hakahana', '8 Sam Nujoma Dr', '+264814567890',
        'Fades, beard sculpting, and full grooms in the heart of Hakahana.', -22.5514, 17.0908);

-- Shop hours: Mon-Sat 08:00-18:00, closed Sunday
INSERT INTO "AvailabilityHour" ("id", "shopId", "dayOfWeek", "openTime", "closeTime", "isClosed") VALUES
  ('ah_shop_0', 'shop_classiccutz', 0, '08:00', '18:00', true),
  ('ah_shop_1', 'shop_classiccutz', 1, '08:00', '18:00', false),
  ('ah_shop_2', 'shop_classiccutz', 2, '08:00', '18:00', false),
  ('ah_shop_3', 'shop_classiccutz', 3, '08:00', '18:00', false),
  ('ah_shop_4', 'shop_classiccutz', 4, '08:00', '18:00', false),
  ('ah_shop_5', 'shop_classiccutz', 5, '08:00', '18:00', false),
  ('ah_shop_6', 'shop_classiccutz', 6, '08:00', '18:00', false);

-- ── Shop-based barbers ───────────────────────────────────────────────────
INSERT INTO "User" ("id", "email", "phone", "name", "passwordHash", "role") VALUES
  ('usr_marcus', 'marcus@barber.com', '+264811111111', 'Marcus V.', '$2b$10$/tmPFqtUI4eQVEzlPzhFIu/GenTWXskhqG3gIJck1cwWucWGhNj6K', 'BARBER'),
  ('usr_david', 'david@barber.com', '+264811222222', 'David K.', '$2b$10$/tmPFqtUI4eQVEzlPzhFIu/GenTWXskhqG3gIJck1cwWucWGhNj6K', 'BARBER');

INSERT INTO "BarberProfile" ("id", "userId", "shopId", "bio", "skills", "ratingAvg", "ratingCount") VALUES
  ('brb_marcus', 'usr_marcus', 'shop_classiccutz', 'Fade specialist, 8 years experience', ARRAY['Skin Fade'], 4.8, 32),
  ('brb_david', 'usr_david', 'shop_classiccutz', 'Beard sculpting and hot towel shaves', ARRAY['Beard Sculpt'], 4.6, 18);

INSERT INTO "Service" ("id", "shopId", "name", "description", "priceInCents", "durationMin") VALUES
  ('svc_fade', 'shop_classiccutz', 'Skin Fade', 'Premium mid/high skin fade', 7000, 45),
  ('svc_beard', 'shop_classiccutz', 'Beard Sculpt & Shave', 'Hot towel razor shave', 5000, 30),
  ('svc_kids', 'shop_classiccutz', 'Kids Cut', NULL, 4000, 25);

-- ── Freelance / mobile barber (house calls) ─────────────────────────────
INSERT INTO "User" ("id", "email", "phone", "name", "passwordHash", "role")
VALUES ('usr_moses', 'moses@freelance.com', '+264811333333', 'Moses N.',
        '$2b$10$/tmPFqtUI4eQVEzlPzhFIu/GenTWXskhqG3gIJck1cwWucWGhNj6K', 'BARBER');

INSERT INTO "BarberProfile"
  ("id", "userId", "bio", "skills", "isMobile", "baseLatitude", "baseLongitude", "travelRadiusKm", "houseCallFeeInCents", "ratingAvg", "ratingCount")
VALUES
  ('brb_moses', 'usr_moses', 'Mobile barber — I bring the chair to you. Windhoek West, Klein Windhoek, Eros.',
   ARRAY['Haircut', 'Fade', 'Kids Cut'], true, -22.5709, 17.0836, 15, 15000, 4.9, 12);

INSERT INTO "Service" ("id", "barberId", "name", "description", "priceInCents", "durationMin", "allowsHouseCall") VALUES
  ('svc_moses_haircut', 'brb_moses', 'Haircut', 'Full haircut, house call ready', 8000, 40, true),
  ('svc_moses_kids', 'brb_moses', 'Kids Cut', NULL, 5000, 25, true);

-- Moses's hours: Mon-Sat 09:00-17:00, closed Sunday
INSERT INTO "AvailabilityHour" ("id", "barberId", "dayOfWeek", "openTime", "closeTime", "isClosed") VALUES
  ('ah_moses_0', 'brb_moses', 0, '09:00', '17:00', true),
  ('ah_moses_1', 'brb_moses', 1, '09:00', '17:00', false),
  ('ah_moses_2', 'brb_moses', 2, '09:00', '17:00', false),
  ('ah_moses_3', 'brb_moses', 3, '09:00', '17:00', false),
  ('ah_moses_4', 'brb_moses', 4, '09:00', '17:00', false),
  ('ah_moses_5', 'brb_moses', 5, '09:00', '17:00', false),
  ('ah_moses_6', 'brb_moses', 6, '09:00', '17:00', false);

-- ── Shop-less freelance barber with a pending join request ─────────────
INSERT INTO "User" ("id", "email", "phone", "name", "passwordHash", "role")
VALUES ('usr_thomas', 'thomas@freelance.com', '+264811444444', 'Thomas N.',
        '$2b$10$/tmPFqtUI4eQVEzlPzhFIu/GenTWXskhqG3gIJck1cwWucWGhNj6K', 'BARBER');

INSERT INTO "BarberProfile" ("id", "userId", "bio", "skills")
VALUES ('brb_thomas', 'usr_thomas', 'Newly freelance, looking for a shop chair', ARRAY['Haircut']);

INSERT INTO "ShopJoinRequest" ("id", "shopId", "barberId", "message")
VALUES ('jr_thomas', 'shop_classiccutz', 'brb_thomas', 'Hi! I used to cut at Fresh Fadez, would love a chair here.');

-- ── Customer + sample bookings ──────────────────────────────────────────
INSERT INTO "User" ("id", "email", "phone", "name", "passwordHash", "role")
VALUES ('usr_ndapewa', 'ndapewa@client.com', '+264815555555', 'Ndapewa K.',
        '$2b$10$/tmPFqtUI4eQVEzlPzhFIu/GenTWXskhqG3gIJck1cwWucWGhNj6K', 'CUSTOMER');

-- Shop booking today at 15:00, cash payment, already confirmed
INSERT INTO "Appointment"
  ("id", "customerId", "barberId", "serviceId", "shopId", "startTime", "endTime", "status", "totalPriceInCents")
VALUES
  ('appt_shop', 'usr_ndapewa', 'brb_marcus', 'svc_fade', 'shop_classiccutz',
   (CURRENT_DATE + TIME '15:00'), (CURRENT_DATE + TIME '15:45'), 'CONFIRMED', 7000);

INSERT INTO "Payment" ("id", "appointmentId", "provider", "amountInCents", "status")
VALUES ('pay_shop', 'appt_shop', 'cash', 7000, 'PENDING');

-- House-call booking tomorrow at 10:00, awaiting online payment
INSERT INTO "Appointment"
  ("id", "customerId", "barberId", "serviceId", "isHouseCall", "houseCallAddress", "startTime", "endTime", "status", "totalPriceInCents")
VALUES
  ('appt_housecall', 'usr_ndapewa', 'brb_moses', 'svc_moses_haircut', true, '12 Sam Nujoma Dr, Klein Windhoek',
   (CURRENT_DATE + INTERVAL '1 day' + TIME '10:00'), (CURRENT_DATE + INTERVAL '1 day' + TIME '10:40'),
   'PENDING', 23000);

INSERT INTO "Payment" ("id", "appointmentId", "provider", "amountInCents", "status")
VALUES ('pay_housecall', 'appt_housecall', 'stripe', 23000, 'PENDING');
