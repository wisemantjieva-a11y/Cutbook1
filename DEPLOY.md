# Deploying CutBook — step by step

This path avoids using a terminal wherever possible. You'll do three things: create a database,
put the code on GitHub, then connect GitHub to Vercel (which hosts and runs the app).

## 1. Create the database (Neon)

1. Go to **neon.tech** and sign up (free tier is enough to start).
2. Click **Create a project**. Name it `cutbook`. Region: pick one close to Windhoek (e.g. Frankfurt/EU).
3. Once created, Neon shows a **connection string** that looks like:
   `postgresql://user:password@ep-xxxx.eu-central-1.aws.neon.tech/cutbook?sslmode=require`
   **Copy this — you'll need it twice.**
4. In the Neon dashboard, open the **SQL Editor** tab.
5. Open `prisma/manual-deploy/001_init_schema.sql` from this project, copy its entire contents,
   paste into the SQL Editor, and click **Run**. This creates all the tables.
6. (Optional but recommended for your first look at the app) Open
   `prisma/manual-deploy/002_seed_data.sql`, paste it in the same way, and run it. This adds demo
   logins so you can see the app working immediately — every seeded account's password is
   `password123` (see the account list at the bottom of `README.md`).

You now have a live, populated database. No terminal, no Prisma CLI needed for this step.

## 2. Put the code on GitHub

1. Go to **github.com**, sign up if you don't have an account, click the **+** → **New repository**.
   Name it `cutbook`, keep it **Private**, don't add a README (we already have one).
2. On the new repo's page, click **uploading an existing file**.
3. Unzip the project I gave you on your computer, then drag the *contents* of the `cutbook` folder
   (not the folder itself) into the GitHub upload box. GitHub will warn about `node_modules` not
   being there — that's expected and correct, don't upload that folder if you see it (there isn't
   one in the zip I gave you).
4. Commit the upload.

If you'll be asking me for more changes later, the easiest ongoing flow is installing **GitHub
Desktop** (a free app) once you're ready — it lets you pull down updates I give you with a couple
of clicks instead of re-uploading a zip each time. Not required to get started though.

## 3. Deploy on Vercel

1. Go to **vercel.com**, sign up using **"Continue with GitHub"** (this links the accounts).
2. Click **Add New → Project**, find your `cutbook` repo, click **Import**.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `DATABASE_URL` — paste the Neon connection string from step 1
   - `JWT_SECRET` — any long random string (e.g. mash your keyboard for 40 characters)
   - `APP_URL` — leave blank for now, you'll fill this in after the first deploy gives you a URL
   - `CRON_SECRET` — any random string (enables the SMS reminder cron job)

   You can leave `STRIPE_*`, `AT_*`, and `S3_*` blank for now — the app runs fine without them,
   just with payments/SMS/photo-uploads showing a friendly "not configured yet" message instead of
   working. Add those later the same way (see step 5).
4. Click **Deploy**. Takes about a minute.
5. Once deployed, Vercel gives you a URL like `cutbook-yourname.vercel.app`. Go back into
   **Settings → Environment Variables**, set `APP_URL` to that exact URL, and **redeploy**
   (Vercel → Deployments → ⋯ → Redeploy) so links in SMS/Stripe redirects point to the right place.

## 4. Try it

Visit your Vercel URL. If you ran the seed script in step 1, log in as:
- `owner@classiccutz.com` / `password123` — shop owner dashboard
- `moses@freelance.com` / `password123` — freelance/mobile barber
- `ndapewa@client.com` / `password123` — customer, browse and book

## 5. Add payments, SMS, and photo uploads later (optional, whenever you're ready)

Each of these is: sign up for the service, copy some keys, paste them into Vercel's Environment
Variables, redeploy. None of them require touching code.

- **Stripe** (payments): dashboard.stripe.com → Developers → API keys → copy the test keys into
  `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. For `STRIPE_WEBHOOK_SECRET`, add a
  webhook endpoint in Stripe pointing at `https://<your-vercel-url>/api/webhooks/stripe`, listening
  for `checkout.session.completed` — Stripe shows you the signing secret when you create it.
- **Africa's Talking** (SMS): account.africastalking.com → get your API key and username, set
  `AT_API_KEY` / `AT_USERNAME`. Start in their sandbox before going live.
- **Object storage** (photos): easiest is Cloudflare R2 (has a generous free tier) — create a
  bucket, create an API token, set `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY`, and make the bucket public (or put a Cloudflare custom domain in front of
  it) for `S3_PUBLIC_BASE_URL`.

## If something goes wrong

The most common issue is a typo in `DATABASE_URL` (missing `?sslmode=require` at the end for Neon,
or a copy-paste error). Vercel's **Deployments → [latest] → Logs** tab shows the actual error if
the app fails to start — paste that to me and I'll tell you what's wrong.
