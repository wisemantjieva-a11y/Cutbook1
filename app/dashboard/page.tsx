'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiFetch, money } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F1EFE8', CONFIRMED: '#E1F5EE', COMPLETED: '#EAF3DE', CANCELED: '#FCEBEB', NO_SHOW: '#FCEBEB',
}

export default function Dashboard() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [queue, setQueue] = useState<any>(null)
  const [tab, setTab] = useState<'today' | 'upcoming' | 'all'>('today')
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/auth/me').then((r) => {
      if (!r.data) {
        router.push('/login?returnTo=/dashboard')
        return
      }
      setMe(r.data)
    })
  }, [router])

  useEffect(() => {
    if (!me) return
    apiFetch('/api/bookings').then((r) => setBookings(r.data)).catch((e) => setError(e.message))
    if (me.shops?.[0]) {
      apiFetch(`/api/dashboard/queue?shopId=${me.shops[0].id}`).then((r) => setQueue(r.data)).catch(() => {})
    }
  }, [me])

  async function changeStatus(id: string, status: string) {
    try {
      await apiFetch(`/api/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (!me) return <div className="container p-1 center muted">Loading…</div>

  const today = new Date().toDateString()
  const shown = bookings.filter((b) => {
    if (tab === 'today') return new Date(b.startTime).toDateString() === today
    if (tab === 'upcoming') return b.status === 'CONFIRMED' || b.status === 'PENDING'
    return true
  })

  const completedToday = bookings.filter(
    (b) => new Date(b.startTime).toDateString() === today && b.status === 'COMPLETED'
  )
  const revenue = completedToday.reduce((sum, b) => sum + b.totalPriceInCents, 0)
  const tips = completedToday.reduce((sum, b) => sum + (b.tipInCents || 0), 0)

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{me.name}</div>
            <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>{me.role.replace('_', ' ')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {me.role === 'ADMIN' && (
              <Link href="/admin" className="badge" style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}>🛡 Admin</Link>
            )}
            <Link href="/dashboard/settings" className="badge" style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}>⚙ Settings</Link>
            <button
              onClick={async () => { await apiFetch('/api/auth/logout', { method: 'POST' }); router.push('/') }}
              className="badge" style={{ background: 'rgba(255,255,255,.15)', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        </div>

        {me.role === 'BARBER' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
            <div className="card" style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{money(revenue)}</div>
              <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>Today's earnings</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{completedToday.length}</div>
              <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>Cuts done</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{money(tips)}</div>
              <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>Tips</div>
            </div>
          </div>
        )}

        {queue && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
            <div className="card" style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{queue.estimatedWaitMinutes} min</div>
              <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>Est. wait</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{money(revenue)}</div>
              <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>Today's revenue</div>
            </div>
            <div className="card" style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{queue.activeBarberCount}</div>
              <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>Active chairs</div>
            </div>
          </div>
        )}
      </div>

      <div className="tabs">
        {(['today', 'upcoming', 'all'] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-1">
        {error && <div className="error-text">{error}</div>}
        {shown.length === 0 && <p className="muted center" style={{ padding: '2rem 0' }}>No bookings to show.</p>}
        {shown.map((b) => (
          <div key={b.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{b.customer.name}</div>
                <div className="muted">{b.service.name} {b.isHouseCall ? '· 🚗 house call' : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 500 }}>{new Date(b.startTime).toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="muted">{money(b.totalPriceInCents)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
              <span className="badge" style={{ background: STATUS_COLORS[b.status] }}>{b.status}</span>
              {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => changeStatus(b.id, 'COMPLETED')}>Done</button>
                  <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => changeStatus(b.id, 'NO_SHOW')}>No show</button>
                  <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => changeStatus(b.id, 'CANCELED')}>Cancel</button>
                </div>
              )}
              {b.customer.phone && <span className="muted">📞 {b.customer.phone}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
