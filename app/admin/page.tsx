'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type UserRow = {
  id: string; name: string; email: string; phone: string | null
  role: string; status: string; subscriptionStatus: string
  subscriptionPaidUntil: string | null; createdAt: string
  approvedAt: string | null; suspendedAt: string | null; suspendReason: string | null
}

type Summary = {
  totalBarbers: number; activeBarbers: number; pendingBarbers: number; suspendedBarbers: number
  totalShopOwners: number; activeShopOwners: number; pendingShopOwners: number; suspendedShopOwners: number
  totalCustomers: number
}

type Tab = 'pending' | 'overdue' | 'active' | 'suspended' | 'all'

export default function AdminDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      if (res.status === 401 || res.status === 403) { router.push('/admin/login'); return }
      const json = await res.json()
      if (json.success) { setUsers(json.data.users); setSummary(json.data.summary) }
    } catch { setError('Failed to load data') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  async function doAction(userId: string, action: string, suspendReason?: string) {
    setActionLoading(userId + action)
    try {
      const res = await fetch('/api/admin/users/' + userId + '/status', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, suspendReason }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      await loadData()
    } catch (e: any) { alert(e.message || 'Action failed') }
    finally { setActionLoading(null) }
  }

  const now = new Date()
  const isOverdue = (u: UserRow) =>
    u.status === 'ACTIVE' && u.subscriptionStatus !== 'NONE' &&
    u.subscriptionPaidUntil && new Date(u.subscriptionPaidUntil) < now

  const pending = users.filter(u => u.status === 'PENDING')
  const overdue = users.filter(isOverdue)
  const suspended = users.filter(u => u.status === 'SUSPENDED')
  const active = users.filter(u => u.status === 'ACTIVE')

  const tabs: { key: Tab; label: string; count: number; color: string }[] = [
    { key: 'pending', label: 'Pending', count: pending.length, color: '#f59e0b' },
    { key: 'overdue', label: 'Overdue', count: overdue.length, color: '#ef4444' },
    { key: 'active', label: 'Active', count: active.length, color: '#22c55e' },
    { key: 'suspended', label: 'Suspended', count: suspended.length, color: '#94a3b8' },
    { key: 'all', label: 'All', count: users.length, color: 'var(--text)' },
  ]

  const displayed =
    tab === 'pending' ? pending :
    tab === 'overdue' ? overdue :
    tab === 'active' ? active :
    tab === 'suspended' ? suspended : users

  if (loading) return <div className="container center muted" style={{ marginTop: '3rem' }}>Loading…</div>

  return (
    <div className="container" style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>✂️</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>CutBook Admin</span>
        </div>
        <Link href="/admin/login" className="muted" style={{ fontSize: 12 }}>← Sign out</Link>
      </div>

      {error && <div className="error-text">{error}</div>}

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: '1.5rem' }}>
          {[
            { label: 'Barbers', v: summary.totalBarbers, c: 'var(--text)' },
            { label: 'Shop Owners', v: summary.totalShopOwners, c: 'var(--text)' },
            { label: 'Customers', v: summary.totalCustomers, c: 'var(--text)' },
            { label: 'Pending', v: pending.length, c: '#f59e0b' },
            { label: 'Overdue', v: overdue.length, c: '#ef4444' },
            { label: 'Suspended', v: suspended.length, c: '#94a3b8' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.c }}>{s.v}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0.75rem',
            fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? t.color : 'var(--muted)',
            borderBottom: tab === t.key ? '2px solid ' + t.color : '2px solid transparent',
            marginBottom: -1, whiteSpace: 'nowrap',
          }}>
            {t.label} {t.count > 0 && <span style={{ fontSize: 11, opacity: 0.8 }}>({t.count})</span>}
          </button>
        ))}
      </div>

      {displayed.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>
            {tab === 'pending' ? '✓' : tab === 'overdue' ? '✓' : '—'}
          </div>
          <p className="muted">
            {tab === 'pending' ? 'No pending approvals' :
             tab === 'overdue' ? 'No overdue subscriptions' :
             'No users here'}
          </p>
        </div>
      )}

      {displayed.map(u => {
        const isPending = u.status === 'PENDING'
        const isActive = u.status === 'ACTIVE'
        const isSuspended = u.status === 'SUSPENDED'
        const statusColor = isPending ? '#f59e0b' : isActive ? '#22c55e' : '#ef4444'
        const paidUntil = u.subscriptionPaidUntil ? new Date(u.subscriptionPaidUntil) : null
        const overdueUser = isOverdue(u)
        const daysOver = overdueUser && paidUntil ? Math.floor((now.getTime() - paidUntil.getTime()) / 86400000) : 0

        return (
          <div key={u.id} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderLeft: overdueUser ? '3px solid #ef4444' : isPending ? '3px solid #f59e0b' : '1px solid var(--border)',
            borderRadius: 8, padding: '1rem', marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 500 }}>{u.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{u.email}{u.phone ? ' · ' + u.phone : ''}</div>
                <div style={{ fontSize: 12, marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ background: statusColor + '22', color: statusColor, borderRadius: 4, padding: '1px 6px' }}>{u.status}</span>
                  <span className="muted">{u.role.replace('_', ' ')}</span>
                  {u.subscriptionStatus !== 'NONE' && (
                    <span style={{
                      background: overdueUser ? '#ef444422' : '#22c55e22',
                      color: overdueUser ? '#ef4444' : '#22c55e',
                      borderRadius: 4, padding: '1px 6px',
                    }}>
                      {overdueUser
                        ? 'Overdue ' + daysOver + 'd'
                        : u.subscriptionStatus === 'PAID' && paidUntil
                          ? 'Paid until ' + paidUntil.toLocaleDateString()
                          : 'Unpaid'}
                    </span>
                  )}
                </div>
                {isPending && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Registered {new Date(u.createdAt).toLocaleDateString()}</div>}
                {isSuspended && u.suspendReason && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Reason: {u.suspendReason}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {isPending && (
                  <>
                    <button className="btn" style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#22c55e' }}
                      disabled={!!actionLoading} onClick={() => doAction(u.id, 'approve')}>
                      {actionLoading === u.id + 'approve' ? '…' : '✓ Approve'}
                    </button>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: '0.3rem 0.75rem', borderColor: '#ef4444', color: '#ef4444' }}
                      disabled={!!actionLoading}
                      onClick={() => { const r = prompt('Reason for rejection:'); if (r !== null) doAction(u.id, 'suspend', r) }}>
                      Reject
                    </button>
                  </>
                )}
                {isActive && (
                  overdueUser ? (
                    <button className="btn" style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#ef4444' }}
                      disabled={!!actionLoading} onClick={() => doAction(u.id, 'suspend', 'Non-payment of N$300 monthly subscription')}>
                      {actionLoading === u.id + 'suspend' ? '…' : 'Suspend (Non-Payment)'}
                    </button>
                  ) : (
                    <button className="btn" style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#ef4444' }}
                      disabled={!!actionLoading}
                      onClick={() => { const r = prompt('Reason for suspension:'); if (r !== null) doAction(u.id, 'suspend', r) }}>
                      {actionLoading === u.id + 'suspend' ? '…' : 'Suspend'}
                    </button>
                  )
                )}
                {isSuspended && (
                  <button className="btn" style={{ fontSize: 12, padding: '0.3rem 0.75rem' }}
                    disabled={!!actionLoading} onClick={() => doAction(u.id, 'reactivate')}>
                    {actionLoading === u.id + 'reactivate' ? '…' : 'Reactivate'}
                  </button>
                )}
                {u.subscriptionStatus !== 'NONE' && (
                  <button className="btn" style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#3b82f6' }}
                    disabled={!!actionLoading} onClick={() => doAction(u.id, 'mark_paid')}>
                    {actionLoading === u.id + 'mark_paid' ? '…' : 'Mark Paid N$300'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
