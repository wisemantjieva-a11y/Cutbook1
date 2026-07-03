'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

export default function AdminPage() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  async function load() {
    const overview = await apiFetch('/api/admin/overview')
    setData(overview.data)
  }

  useEffect(() => {
    apiFetch('/api/auth/me').then((r) => {
      if (!r.data) { router.push('/login?returnTo=/admin'); return }
      if (r.data.role !== 'ADMIN') { router.push('/'); return }
      setMe(r.data)
    })
  }, [router])

  useEffect(() => { if (me) load().catch((e) => setError(e.message)) }, [me])

  async function toggleShop(id: string, isActive: boolean) {
    try {
      await apiFetch(`/api/shops/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !isActive }) })
      await load()
    } catch (e: any) { setError(e.message) }
  }

  async function toggleBarber(id: string, isAvailable: boolean) {
    try {
      await apiFetch(`/api/barbers/${id}`, { method: 'PATCH', body: JSON.stringify({ isAvailable: !isAvailable }) })
      await load()
    } catch (e: any) { setError(e.message) }
  }

  if (!me || !data) return <div className="container p-1 center muted">Loading…</div>

  return (
    <div className="container">
      <div className="header">
        <Link href="/dashboard" className="muted" style={{ color: 'rgba(255,255,255,.8)' }}>← Dashboard</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Admin</div>
          <Link href="/admin/subscriptions" className="badge" style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}>💳 Subscriptions</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
          {[
            ['Shops', data.shops.length],
            ['Barbers', data.barbers.length],
            ['Users', data.userCount],
            ['Bookings', data.appointmentCount],
          ].map(([label, val]: any) => (
            <div key={label} className="card" style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{val}</div>
              <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-1">
        {error && <div className="error-text">{error}</div>}
        {data.pendingJoinRequests > 0 && (
          <p className="muted">{data.pendingJoinRequests} pending shop join request(s) — handled by each shop owner in their settings.</p>
        )}

        <h3>Shops</h3>
        <div className="stack">
          {data.shops.map((s: any) => (
            <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{s.name}</div>
                <div className="muted">{s.area} · {s.category} · owner {s.owner.name} · {s.barbers.length} stylist(s)</div>
              </div>
              <button className={s.isActive ? 'btn btn-danger' : 'btn'} style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => toggleShop(s.id, s.isActive)}>
                {s.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>

        <h3>Stylists</h3>
        <div className="stack">
          {data.barbers.map((b: any) => (
            <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{b.user.name}</div>
                <div className="muted">
                  {b.shop ? b.shop.name : b.isMobile ? 'Freelance / mobile' : 'Unassigned'} · ⭐{b.ratingAvg.toFixed(1)} ({b.ratingCount})
                </div>
              </div>
              <button className={b.isAvailable ? 'btn btn-danger' : 'btn'} style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => toggleBarber(b.id, b.isAvailable)}>
                {b.isAvailable ? 'Suspend' : 'Reinstate'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
