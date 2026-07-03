'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch, money } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  TRIALING: '#F1EFE8',
  ACTIVE: '#E1F5EE',
  PAST_DUE: '#FCEBEB',
  SUSPENDED: '#FCEBEB',
  CANCELED: '#eee',
}

function dueDate(sub: any) {
  return sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : new Date(sub.trialEndsAt)
}

function daysLeft(sub: any) {
  const ms = dueDate(sub).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default function AdminSubscriptions() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [subs, setSubs] = useState<any[]>([])
  const [error, setError] = useState('')
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, { amount: string; method: string; note: string }>>({})

  async function load() {
    const r = await apiFetch('/api/admin/subscriptions')
    const sorted = [...r.data].sort((a, b) => daysLeft(a) - daysLeft(b))
    setSubs(sorted)
  }

  useEffect(() => {
    apiFetch('/api/auth/me').then((r) => {
      if (!r.data) { router.push('/login?returnTo=/admin/subscriptions'); return }
      if (r.data.role !== 'ADMIN') { router.push('/'); return }
      setMe(r.data)
    })
  }, [router])

  useEffect(() => { if (me) load().catch((e) => setError(e.message)) }, [me])

  async function saveFee(id: string, monthlyFeeInCents: number) {
    try {
      await apiFetch(`/api/admin/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify({ monthlyFeeInCents }) })
      await load()
    } catch (e: any) { setError(e.message) }
  }

  async function setStatus(id: string, status: string) {
    try {
      await apiFetch(`/api/admin/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await load()
    } catch (e: any) { setError(e.message) }
  }

  function draftFor(sub: any) {
    return paymentDrafts[sub.id] || { amount: String(sub.monthlyFeeInCents / 100 || ''), method: 'eft', note: '' }
  }

  function updateDraft(id: string, patch: Partial<{ amount: string; method: string; note: string }>) {
    setPaymentDrafts((prev) => ({
      ...prev,
      [id]: { amount: '', method: 'eft', note: '', ...prev[id], ...patch },
    }))
  }

  async function recordPayment(sub: any) {
    setError('')
    const draft = draftFor(sub)
    const amountInCents = Math.round(Number(draft.amount) * 100)
    if (!amountInCents || amountInCents <= 0) { setError('Enter a valid amount'); return }
    try {
      await apiFetch(`/api/admin/subscriptions/${sub.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({ amountInCents, method: draft.method, note: draft.note || undefined }),
      })
      setPaymentDrafts((prev) => { const next = { ...prev }; delete next[sub.id]; return next })
      await load()
    } catch (e: any) { setError(e.message) }
  }

  if (!me) return <div className="container p-1 center muted">Loading…</div>

  return (
    <div className="container">
      <div className="header">
        <Link href="/admin" className="muted" style={{ color: 'rgba(255,255,255,.8)' }}>← Admin</Link>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>Subscriptions</div>
        <div className="muted" style={{ color: 'rgba(255,255,255,.75)' }}>Trial status and manually-tracked payments</div>
      </div>

      <div className="p-1">
        {error && <div className="error-text">{error}</div>}

        {subs.map((sub) => {
          const name = sub.shop?.name || sub.barber?.user?.name || 'Unknown'
          const type = sub.shop ? `Shop · ${sub.shop.area}` : 'Freelance stylist'
          const contact = sub.shop?.owner || sub.barber?.user
          const left = daysLeft(sub)
          const draft = draftFor(sub)

          return (
            <div key={sub.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{name}</div>
                  <div className="muted">{type}</div>
                  {contact && <div className="muted">{contact.name} · {contact.phone || contact.email}</div>}
                </div>
                <span className="badge" style={{ background: STATUS_COLORS[sub.status] }}>{sub.status}</span>
              </div>

              <div className="muted" style={{ marginTop: 8 }}>
                {sub.status === 'TRIALING' ? 'Trial ends' : 'Paid through'}: {dueDate(sub).toLocaleDateString('en-NA', { dateStyle: 'medium' })}
                {' · '}
                {left >= 0 ? `${left} day${left === 1 ? '' : 's'} left` : `${Math.abs(left)} day${Math.abs(left) === 1 ? '' : 's'} overdue`}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <span className="label" style={{ margin: 0 }}>Monthly fee N$</span>
                <input
                  type="number"
                  defaultValue={sub.monthlyFeeInCents / 100}
                  style={{ width: 90, padding: 4, fontSize: 13, margin: 0 }}
                  onBlur={(e) => saveFee(sub.id, Math.round(Number(e.target.value) * 100))}
                />
              </div>

              <div style={{ marginTop: 10, borderTop: '1px solid #eee', paddingTop: 10 }}>
                <div className="label">Record a payment</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    type="number" placeholder="Amount N$" value={draft.amount}
                    onChange={(e) => updateDraft(sub.id, { amount: e.target.value })}
                    style={{ flex: 1, padding: 6, fontSize: 13, margin: 0 }}
                  />
                  <select value={draft.method} onChange={(e) => updateDraft(sub.id, { method: e.target.value })} style={{ margin: 0, padding: 6, fontSize: 13 }}>
                    <option value="eft">EFT</option>
                    <option value="cash">Cash</option>
                    <option value="whatsapp">WhatsApp Pay</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <input
                  placeholder="Note (optional)" value={draft.note}
                  onChange={(e) => updateDraft(sub.id, { note: e.target.value })}
                  style={{ width: '100%', padding: 6, fontSize: 13, marginBottom: 8 }}
                />
                <button className="btn" style={{ width: '100%', padding: 8, fontSize: 13 }} onClick={() => recordPayment(sub)}>
                  Record payment & extend 1 month
                </button>
              </div>

              {sub.status !== 'SUSPENDED' && (
                <button className="btn btn-danger" style={{ width: '100%', marginTop: 8, padding: 6, fontSize: 12 }} onClick={() => setStatus(sub.id, 'SUSPENDED')}>
                  Suspend (not paying)
                </button>
              )}
              {sub.status === 'SUSPENDED' && (
                <button className="btn btn-outline" style={{ width: '100%', marginTop: 8, padding: 6, fontSize: 12 }} onClick={() => setStatus(sub.id, 'ACTIVE')}>
                  Reinstate
                </button>
              )}

              {sub.payments?.length > 0 && (
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Last payment: {money(sub.payments[0].amountInCents)} via {sub.payments[0].method} on{' '}
                  {new Date(sub.payments[0].paidAt).toLocaleDateString('en-NA', { dateStyle: 'medium' })}
                </div>
              )}
            </div>
          )
        })}

        {subs.length === 0 && <p className="muted center" style={{ padding: '2rem 0' }}>No subscriptions yet.</p>}
      </div>
    </div>
  )
}
