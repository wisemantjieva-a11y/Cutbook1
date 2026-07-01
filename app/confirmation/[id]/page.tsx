'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiFetch, money } from '@/lib/api'

export default function Confirmation({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams()
  const [bookings, setBookings] = useState<any[]>([])
  const [booking, setBooking] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const r = await apiFetch('/api/bookings')
    const found = r.data.find((b: any) => b.id === params.id)
    setBooking(found || null)
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [params.id])

  async function payNow() {
    try {
      const pay = await apiFetch('/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ appointmentId: params.id }),
      })
      window.location.href = pay.data.checkoutUrl
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function submitReview() {
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ appointmentId: params.id, rating, comment }),
      })
      setReviewSubmitted(true)
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (error) return <div className="container p-1 center error-text">{error}</div>
  if (!booking) return <div className="container p-1 center muted">Loading…</div>

  const paid = searchParams.get('paid') === '1'

  return (
    <div className="container">
      <div className="header center">
        <div style={{ fontSize: 40 }}>{booking.status === 'CANCELED' ? '✕' : '✓'}</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          {booking.status === 'PENDING' && 'Awaiting payment'}
          {booking.status === 'CONFIRMED' && 'Booking confirmed'}
          {booking.status === 'COMPLETED' && 'Visit completed'}
          {booking.status === 'CANCELED' && 'Booking canceled'}
        </div>
      </div>

      <div className="p-1">
        <div className="card">
          <div style={{ fontWeight: 500 }}>{booking.service.name}</div>
          <div className="muted">with {booking.barber.user.name}</div>
          <div className="muted">{new Date(booking.startTime).toLocaleString('en-NA', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          {booking.isHouseCall && <div className="muted">🚗 House call: {booking.houseCallAddress}</div>}
          <div style={{ marginTop: 8, fontWeight: 500 }}>{money(booking.totalPriceInCents)}</div>
          <div className="muted">Payment: {booking.payment?.status} ({booking.payment?.provider})</div>
        </div>

        {booking.status === 'PENDING' && booking.payment?.provider === 'stripe' && booking.payment?.status !== 'PAID' && (
          <button className="btn" style={{ width: '100%' }} onClick={payNow}>Pay now</button>
        )}

        {booking.status === 'COMPLETED' && !booking.review && !reviewSubmitted && (
          <div className="card">
            <div className="label">Rate your visit</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>
                  {n <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <textarea className="input" rows={2} placeholder="How was it?" value={comment} onChange={(e) => setComment(e.target.value)} />
            <button className="btn" style={{ width: '100%' }} onClick={submitReview}>Submit review</button>
          </div>
        )}
        {(reviewSubmitted || booking.review) && <p className="muted center">Thanks for the review!</p>}

        <Link href="/" className="btn btn-outline" style={{ width: '100%', marginTop: 12, textAlign: 'center' }}>
          Back to home
        </Link>
      </div>
    </div>
  )
}
