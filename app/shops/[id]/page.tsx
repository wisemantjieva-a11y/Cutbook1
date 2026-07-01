'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch, money } from '@/lib/api'

export default function ShopDetail({ params }: { params: { id: string } }) {
  const [shop, setShop] = useState<any>(null)
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null)

  useEffect(() => {
    apiFetch(`/api/shops/${params.id}`).then((r) => {
      setShop(r.data)
      if (r.data.barbers[0]) setSelectedBarberId(r.data.barbers[0].id)
    })
  }, [params.id])

  if (!shop) return <div className="container p-1 center muted">Loading…</div>

  return (
    <div className="container">
      <div className="header">
        <Link href="/" className="muted" style={{ color: 'rgba(255,255,255,.8)' }}>← Back</Link>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>{shop.name}</div>
        <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>{shop.area} · {shop.address}</div>
        <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>📞 {shop.phone}</div>
      </div>

      <div className="p-1">
        {shop.description && <p className="muted">{shop.description}</p>}

        <h3>Barbers</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
          {shop.barbers.map((b: any) => (
            <button
              key={b.id}
              onClick={() => setSelectedBarberId(b.id)}
              className={selectedBarberId === b.id ? 'btn' : 'btn btn-outline'}
              style={{ padding: '8px 12px', fontSize: 13 }}
            >
              {b.user.name} {b.ratingCount ? `⭐${b.ratingAvg.toFixed(1)}` : ''}
            </button>
          ))}
        </div>

        <h3>Services</h3>
        <div className="stack">
          {shop.services.map((s: any) => (
            <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{s.name}</div>
                <div className="muted">{s.durationMin} min</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>{money(s.priceInCents)}</div>
                <Link
                  href={`/book/shop/${selectedBarberId}?serviceId=${s.id}&shopId=${shop.id}`}
                  className="btn"
                  style={{ fontSize: 13, padding: '6px 10px' }}
                >
                  Book
                </Link>
              </div>
            </div>
          ))}
        </div>

        {shop.reviews?.length > 0 && (
          <>
            <h3>Reviews</h3>
            <div className="stack">
              {shop.reviews.map((r: any) => (
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
