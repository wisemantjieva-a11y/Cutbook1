'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch, money } from '@/lib/api'

export default function BarberDetail({ params }: { params: { id: string } }) {
  const [barber, setBarber] = useState<any>(null)

  useEffect(() => {
    apiFetch(`/api/barbers/${params.id}`).then((r) => setBarber(r.data))
  }, [params.id])

  if (!barber) return <div className="container p-1 center muted">Loading…</div>

  return (
    <div className="container">
      <div className="header">
        <Link href="/" className="muted" style={{ color: 'rgba(255,255,255,.8)' }}>← Back</Link>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>{barber.user.name}</div>
        <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>
          {barber.isMobile ? `🚗 House calls · up to ${barber.travelRadiusKm ?? 10}km` : 'Shop-based'}
        </div>
        <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>
          ⭐ {barber.ratingAvg ? barber.ratingAvg.toFixed(1) : 'New'} ({barber.ratingCount} reviews)
        </div>
      </div>

      <div className="p-1">
        {barber.bio && <p className="muted">{barber.bio}</p>}
        {barber.isMobile && barber.houseCallFeeInCents > 0 && (
          <p className="muted">Callout fee: {money(barber.houseCallFeeInCents)} (added at booking)</p>
        )}

        <h3>Services</h3>
        <div className="stack">
          {barber.services.map((s: any) => (
            <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{s.name}</div>
                <div className="muted">{s.durationMin} min {s.allowsHouseCall ? '· house call available' : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>{money(s.priceInCents)}</div>
                <Link
                  href={`/book/barber/${barber.id}?serviceId=${s.id}`}
                  className="btn"
                  style={{ fontSize: 13, padding: '6px 10px' }}
                >
                  Book
                </Link>
              </div>
            </div>
          ))}
          {barber.services.length === 0 && <p className="muted">No services listed yet.</p>}
        </div>

        {barber.reviews?.length > 0 && (
          <>
            <h3>Reviews</h3>
            <div className="stack">
              {barber.reviews.map((r: any) => (
                <div key={r.id} className="card">
                  <div>{'⭐'.repeat(r.rating)}</div>
                  <div className="muted">{r.author.name}</div>
                  {r.comment && <div style={{ marginTop: 4 }}>{r.comment}</div>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
