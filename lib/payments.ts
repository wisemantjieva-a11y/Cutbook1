import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null

export function stripeConfigured() {
  return Boolean(stripe)
}

/**
 * Creates a Stripe Checkout session for a single appointment.
 * Amount is in cents already (Prisma stores priceInCents).
 */
export async function createCheckoutSession(opts: {
  appointmentId: string
  amountInCents: number
  currency?: string
  description: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env')
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: opts.customerEmail,
    line_items: [
      {
        price_data: {
          currency: opts.currency || 'nad',
          product_data: { name: opts.description },
          unit_amount: opts.amountInCents,
        },
        quantity: 1,
      },
    ],
    metadata: { appointmentId: opts.appointmentId },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  })

  return session
}

export function constructWebhookEvent(rawBody: string | Buffer, signature: string) {
  if (!stripe) throw new Error('Stripe is not configured')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}
