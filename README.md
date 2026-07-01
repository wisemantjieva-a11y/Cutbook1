# CutBook

A booking platform for barbershops **and** freelance/mobile barbers who do house calls, in Windhoek.

This is a full rebuild that replaces the two conflicting codebases from before (an Express+pg backend
modeling a shop marketplace, and a separate Next.js+Prisma backend modeling a single shop). Everything
now lives in one Next.js app with one Prisma schema that supports both business models at once.

## What's in this build

- **Auth**: real registration/login with bcrypt password hashing + JWT session cookies. Three signup
  paths: customer, shop owner, freelance/mobile barber.
- **Two booking surfaces**: browse physical shops (`/`  → Shops tab) or browse freelance barbers who
  travel to you (`/` → House Calls tab). A freelance barber's services can be flagged as house-call
  eligible; a callout fee and travel radius are configurable per barber.
- **Booking engine**: real double-booking prevention (checks for overlapping appointments per barber),
  computes end time from service duration, supports both "pay online" and "pay in person" flows.
- **Payments**: wired to Stripe Checkout. Booking online creates a pending appointment + Stripe session;
  a webhook confirms the appointment and marks payment PAID only once Stripe confirms the charge.
- **SMS**: wired to Africa's Talking. Confirmation SMS fires on cash bookings immediately, and on card
  bookings once the Stripe webhook confirms payment.
- **Reviews**: customers can rate a completed appointment once; barber rating average/count update
  automatically.
- **Owner/barber dashboard**: real bookings pulled from the database (no more mock data), status changes
  (confirm/complete/no-show/cancel), and the live queue/wait-time estimator (now scoped per shop).
- **Real availability**: shops and freelance barbers each set weekly business hours; the booking page
  shows an actual grid of open slots (computed from hours + existing bookings), and the API rejects any
  booking attempt outside business hours or that double-books a barber.
- **Shop join flow**: a shop-less barber can browse shops and send a join request; the shop owner sees
  pending requests in Settings and can approve (which assigns `shopId`) or reject. No more manual API
  calls needed.
- **Admin panel** (`/admin`, ADMIN role only): platform-wide view of shops and barbers with the ability
  to deactivate a shop or suspend a barber.
- **Day-of SMS reminders**: `/api/cron/reminders` finds confirmed appointments starting within the next
  hour that haven't been reminded yet and texts the customer. Wired for Vercel Cron (`vercel.json`,
  every 15 min) — works with any scheduler that can hit a URL, e.g. cron-job.org, if you're not on Vercel.
- **Photo uploads**: shop logo/cover and barber profile photo upload directly to S3-compatible storage
  via presigned URLs (works with AWS S3, Cloudflare R2, or Backblaze B2).

## What still needs your own credentials to go fully live

I can't provision these for you — you'll need to sign up and drop the keys into `.env`:

- **Postgres database** — `DATABASE_URL`
- **Stripe** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  (dashboard.stripe.com). Note: confirm Stripe supports payouts in Namibia, or plan to route payments
  through a supported entity — this is a business decision, not something the code can solve.
- **Africa's Talking** — `AT_API_KEY`, `AT_USERNAME` (account.africastalking.com). Without these, SMS
  calls log to the console instead of sending, so the rest of the flow still works in dev.
- **Object storage** — `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`
  (and `S3_ENDPOINT` if using R2/B2 instead of real AWS S3). Without these, the upload fields return a
  clear "not configured" error instead of crashing.
- **Cron scheduler** — set `CRON_SECRET` in your hosting provider's env vars. On Vercel this is picked
  up automatically by `vercel.json`; elsewhere, point any scheduler at
  `GET /api/cron/reminders` with header `Authorization: Bearer <CRON_SECRET>` every ~15 minutes.

Until those are set, the app runs and the booking flow completes — each unconfigured integration
returns a clear "not configured" error instead of crashing, and SMS just logs instead of sending.

## Setup

**Deploying this live without using a terminal?** See `DEPLOY.md` — it walks through Neon (database),
GitHub, and Vercel using only web forms, plus a pre-written SQL file so you don't need the Prisma CLI
at all to get a working database.

**Developing locally with Node installed?** Use the steps below.

```bash
npm install

cp .env.example .env
# edit .env: set DATABASE_URL at minimum

npx prisma migrate dev --name init
npx prisma db seed

npm run dev
```

Seeded logins (password for all: `password123`):
- `admin@cutbook.com` — admin panel access at `/admin`
- `owner@classiccutz.com` — shop owner (Classic Cutz, 2 barbers, 3 services, hours set, and one pending
  join request waiting in Settings)
- `moses@freelance.com` — freelance/mobile barber offering house calls, with hours set
- `thomas@freelance.com` — shop-less freelance barber who can browse shops and request to join one
- `ndapewa@client.com` — customer with one shop booking + one house-call booking

For Stripe webhooks in local dev, run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
and put the CLI's printed signing secret into `STRIPE_WEBHOOK_SECRET`.

## Known limitations / next steps

- The house-call radius filter uses straight-line (haversine) distance, not real driving distance —
  fine for a v1, but worth swapping for a maps API if drive time matters.
- The admin panel covers shops and barbers (activate/deactivate/suspend); it doesn't yet expose a raw
  user list or manual role changes — do those directly in the DB for now if needed.
- Slot generation uses a fixed 15-minute grid; there's no per-barber buffer time between appointments
  (e.g. cleanup time) — add a `bufferMin` field on `Service` or `BarberProfile` if you want that.
- No cancellation/refund flow wired to Stripe yet — canceling a booking updates its status but doesn't
  automatically refund a paid Stripe charge. Worth adding if online payments become the primary path.
- No push notifications / in-app notification center — SMS is the only outbound channel right now.

## Old files to remove

Once you're happy with this, delete the old `cutbook-backend` Express folder and the old mock
`src/pages/OwnerApp.jsx` / `src/pages/Home.jsx` etc. React app — they're superseded by this project and
kept around would just cause confusion again.
