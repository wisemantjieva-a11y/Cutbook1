'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiFetch, money } from '@/lib/api'

export default function BookPage({ params }: { params: { type: string; id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId') || ''

  const [me, setMe] = useState<any>(null)
  const [barber, setBarber] = useState<any>(null)
  const [service, setService] = useState<any>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState<string[] | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [wantsHouseCall, setWantsHouseCall] = useState(false)
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiFetch('/api/auth/me').then((r) => setMe(r.data)).catch(() => {})
    apiFetch(`/api/barbers/${params.id}`).then((r) => {
      setBarber(r.data)
      const s = r.data.services.find((x: any) => x.id === serviceId)
      setService(s || r.data.services[0])
    })
  }, [params.id, serviceId])

  useEffect(() => {
    if (!date || !service) return
    setSlotsLoading(true)
    setTime('')
    apiFetch(`/api/barbers/${params.id}/slots?date=${date}&serviceId=${service.id}`)
      .then((r) => setSlots(r.data))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [date, service, params.id])

  async function submit() {
    setError('')
    if (!me) {
      router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    if (!date || !time) {
      setError('Choose a date and time')
      return
    }
    if (wantsHouseCall && !address) {
      setError('Enter the address for the house call')
      return
    }

    setSubmitting(true)
    try {
      const startTime = time // already an ISO string, selected from available slots
      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          barberId: barber.id,
          serviceId: service.id,
          startTime,
          isHouseCall: wantsHouseCall,
          houseCallAddress: wantsHouseCall ? address : undefined,
          paymentMethod,
        }),
      })

      if (paymentMethod === 'online') {
        const pay = await apiFetch('/api/payments/create-intent', {
          method: 'POST',
          body: JSON.stringify({ appointmentId: res.data.id }),
        }).catch((e) => {
          // Stripe not configured — fall back to viewing the (pending) confirmation
          console.warn('Payment intent failed, falling back:', e.message)
          return null
        })
        if (pay?.data?.checkoutUrl) {
          window.location.href = pay.data.checkoutUrl
          return
        }
      }
      router.push(`/confirmation/${res.data.id}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!barber || !service) return <div className="container p-1 center muted">Loading…</div>

  const canHouseCall = barber.isMobile && service.allowsHouseCall
  const totalCents = service.priceInCents + (wantsHouseCall ? barber.houseCallFeeInCents : 0)

  return (
    <div className="container">
      <div className="header">
        <Link href={`/barbers/${barber.id}`} className="muted" style={{ color: 'rgba(255,255,255,.8)' }}>← Back</Link>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>Book {service.name}</div>
        <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>with {barber.user.name}</div>
      </div>

      <div className="p-1">
        {error && <div className="error-text">{error}</div>}

        <label className="label">Date</label>
        <input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />

        {date && (
          <>
            <label className="label">Available times</label>
            {slotsLoading && <p className="muted">Checking availability…</p>}
            {!slotsLoading && slots && slots.length === 0 && (
              <p className="muted">No open slots that day — try another date.</p>
            )}
            {!slotsLoading && slots && slots.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {slots.map((iso) => {
                  const label = new Date(iso).toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={time === iso ? 'btn' : 'btn btn-outline'}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                      onClick={() => setTime(iso)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {canHouseCall && (
          <div className="card">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
              <input type="checkbox" checked={wantsHouseCall} onChange={(e) => setWantsHouseCall(e.target.checked)} />
              Have {barber.user.name} come to me (+{money(barber.houseCallFeeInCents)})
            </label>
            {wantsHouseCall && (
              <>
                <label className="label">Address</label>
                <textarea className="input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, suburb, landmark…" />
              </>
            )}
          </div>
        )}

        <label className="label">Payment</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            className={paymentMethod === 'online' ? 'btn' : 'btn btn-outline'}
            style={{ flex: 1, padding: 10, fontSize: 13 }}
            onClick={() => setPaymentMethod('online')}
          >
            Pay online now
          </button>
          <button
            type="button"
            className={paymentMethod === 'cash' ? 'btn' : 'btn btn-outline'}
            style={{ flex: 1, padding: 10, fontSize: 13 }}
            onClick={() => setPaymentMethod('cash')}
          >
            Pay in person
          </button>
        </div>

        <div className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total</span>
          <strong>{money(totalCents)}</strong>
        </div>

        <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={submit} disabled={submitting}>
          {submitting ? 'Booking…' : me ? 'Confirm booking' : 'Sign in to book'}
        </button>
      </div>
    </div>
  )
}
