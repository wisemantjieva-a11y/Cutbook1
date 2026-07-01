'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type UserRow = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  status: string
  subscriptionStatus: string
  subscriptionPaidUntil: string | null
  createdAt: string
  suspendReason: string | null
}

type Summary = {
  totalBarbers: number
  activeBarbers: number
  pendingBarbers: number
  suspendedBarbers: number
  totalShopOwners: number
  activeShopOwners: number
  pendingShopOwners: number
  suspendedShopOwners: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED'>('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      if (res.status === 401) { router.push('/login'); return }
      const json = await res.json()
      if (json.success) {
        setUsers(json.data.users)
        setSummary(json.data.summary)
      }
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function doAction(userId: string, action: string, suspendReason?: string) {
    setActionLoading(userId + action)
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, suspendReason }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      await loadData()
    } catch (e: any) {
      alert(e.message || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = filter === 'ALL' ? users : users.filter(u => u.status === filter)

  const statCard = (label: string, value: number, color: string) => (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '1rem 1.25rem',
      minWidth: 120,
      flex: 1,
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{label}</div>
    </div>
  )

  if (loading) return <div className="container center muted" style={{ marginTop: '3rem' }}>Loading…</div>

  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
        <span style={{ fontSize: 20 }}>✂</span>
        <span style={{ fontSize: 18, fontWeight: 600 }}>CutBook Admin</span>
      </div>

      {error && <div className="error-text">{error}</div>}

      {summary && (
        <>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>BARBERS</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1rem' }}>
            {statCard('Total', summary.totalBarbers, 'var(--text)')}
            {statCard('Active', summary.activeBarbers, 'var(--green)')}
            {statCard('Pending', summary.pendingBarbers, '#f59e0b')}
            {statCard('Suspended', summary.suspendedBarbers, '#ef4444')}
          </div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>SHOP OWNERS</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {statCard('Total', summary.totalShopOwners, 'var(--text)')}
            {statCard('Active', summary.activeShopOwners, 'var(--green)')}
            {statCard('Pending', summary.pendingShopOwners, '#f59e0b')}
            {statCard('Suspended', summary.suspendedShopOwners, '#ef4444')}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'] as const).map(f => (
          <button
            key={f}
            className="btn"
            onClick={() => setFilter(f)}
            style={{ opacity: filter === f ? 1 : 0.5, padding: '0.3rem 0.75rem', fontSize: 13 }}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="muted center" style={{ marginTop: '2rem' }}>No users in this category.</p>
      )}

      {filtered.map(u => {
        const isPending = u.status === 'PENDING'
        const isActive = u.status === 'ACTIVE'
        const isSuspended = u.status === 'SUSPENDED'
        const statusColor = isPending ? '#f59e0b' : isActive ? 'var(--green)' : '#ef4444'
        const subPaidUntil = u.subscriptionPaidUntil
          ? new Date(u.subscriptionPaidUntil).toLocaleDateString()
          : null
        const isOverdue = u.subscriptionPaidUntil
          ? new Date(u.subscriptionPaidUntil) < new Date()
          : u.subscriptionStatus !== 'NONE'

        return (
          <div key={u.id} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '1rem',
            marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{u.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{u.email}{u.phone ? ` · ${u.phone}` : ''}</div>
                <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 8 }}>
                  <span style={{ background: statusColor + '22', color: statusColor, borderRadius: 4, padding: '1px 6px' }}>
                    {u.status}
                  </span>
                  <span className="muted">{u.role.replace('_', ' ')}</span>
                  {u.subscriptionStatus !== 'NONE' && (
                    <span style={{
                      background: isOverdue ? '#ef444422' : '#22c55e22',
                      color: isOverdue ? '#ef4444' : '#22c55e',
                      borderRadius: 4,
                      padding: '1px 6px',
                    }}>
                      {u.subscriptionStatus === 'PAID' ? `Paid until ${subPaidUntil}` : 'Unpaid'}
                    </span>
                  )}
                </div>
                {isSuspended && u.suspendReason && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Reason: {u.suspendReason}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {isPending && (
                  <button className="btn" style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: 'var(--green)' }}
                    disabled={!!actionLoading} onClick={() => doAction(u.id, 'approve')}>
                    {actionLoading === u.id + 'approve' ? '…' : 'Approve'}
                  </button>
                )}
                {isActive && (
                  <button className="btn" style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#ef4444' }}
                    disabled={!!actionLoading}
                    onClick={() => {
                      const reason = prompt('Reason for suspension:')
                      if (reason !== null) doAction(u.id, 'suspend', reason)
                    }}>
                    {actionLoading === u.id + 'suspend' ? '…' : 'Suspend'}
                  </button>
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
