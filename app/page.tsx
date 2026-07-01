'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch, money } from '@/lib/api'

export default function Home() {
  const [mode, setMode] = useState<'shops' | 'housecall'>('shops')
  const [shops, setShops] = useState<any[]>([])
  const [barbers, setBarbers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<any>(null)

  useEffect(() => {
    apiFetch('/api/auth/me').then((r) => setMe(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    if (mode === 'shops') {
      apiFetch('/api/shops').then((r) => setShops(r.data)).finally(() => setLoading(false))
    } else {
      apiFetch('/api/barbers?mobileOnly=true').then((r) => setBarbers(r.data)).finally(() => setLoading(false))
    }
  }, [mode])

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>✂ CutBook</div>
          {me ? (
            <Link href="/dashboard" className="badge" style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}>
              {me.name}
            </Link>
          ) : (
            <Link href="/login" className="badge" style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}>
              Sign in
            </Link>
          )}
        </div>
        <div className="muted" style={{ color: 'rgba(255,255,255,.75)', marginTop: 4 }}>
          Barbershops and mobile barbers in Windhoek
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${mode === 'shops' ? 'active' : ''}`} onClick={() => setMode('shops')}>
          🏠 Shops
        </button>
        <button className={`tab ${mode === 'housecall' ? 'active' : ''}`} onClick={() => setMode('housecall')}>
          🚗 House Calls
        </button>
      </div>

      <div className="p-1">
        {loading && <p className="muted center">Loading…</p>}

        {!loading && mode === 'shops' && shops.length === 0 && (
          <p className="muted center" style={{ padding: '2rem 0' }}>No shops listed yet.</p>
        )}
        {!loading && mode === 'shops' && shops.map((s) => (
          <Link key={s.id} href={`/shops/${s.id}`}>
            <div className="card">
              <div style={{ fontWeight: 500 }}>{s.name}</div>
              <div className="muted">{s.area} · {s.address}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {s.barbers.length} barber{s.barbers.length === 1 ? '' : 's'} · {s.services.length} service{s.services.length === 1 ? '' : 's'}
              </div>
            </div>
          </Link>
        ))}

        {!loading && mode === 'housecall' && barbers.length === 0 && (
          <p className="muted center" style={{ padding: '2rem 0' }}>No mobile barbers available yet.</p>
        )}
        {!loading && mode === 'housecall' && barbers.map((b) => (
          <Link key={b.id} href={`/barbers/${b.id}`}>
            <div className="card">
              <div style={{ fontWeight: 500 }}>{b.user.name}</div>
              <div className="muted">{b.bio || 'Mobile barber'}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                ⭐ {b.ratingAvg ? b.ratingAvg.toFixed(1) : 'New'} ({b.ratingCount}) · callout {money(b.houseCallFeeInCents)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
