'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

const ROLES = [
  { value: 'CUSTOMER', label: 'I want to book a haircut' },
  { value: 'SHOP_OWNER', label: 'I own a barbershop' },
  { value: 'BARBER', label: "I'm a freelance/mobile barber" },
]

export default function Register() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('CUSTOMER')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError('')
    setLoading(true)
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password, role }),
      })
      router.push(role === 'SHOP_OWNER' || role === 'BARBER' ? '/dashboard/settings' : '/')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container p-1">
      <div className="center" style={{ marginBottom: '1.5rem', marginTop: '2rem' }}>
        <div style={{ fontSize: 22, fontWeight: 500 }}>✂ CutBook</div>
        <div className="muted">Create an account</div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <label className="label">I am…</label>
      <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      <label className="label">Full name</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

      <label className="label">Email</label>
      <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

      <label className="label">Phone (for SMS booking confirmations)</label>
      <input className="input" type="tel" placeholder="+264 81 234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} />

      <label className="label">Password</label>
      <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <button className="btn" style={{ width: '100%' }} onClick={submit} disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      <p className="center muted" style={{ marginTop: 12 }}>
        Already have an account? <Link href="/login" style={{ color: 'var(--green)' }}>Sign in</Link>
      </p>
    </div>
  )
}
