'use client'
import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError('')
    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }) as any
      const role = data?.data?.role
      const status = data?.data?.status
      if (role === 'ADMIN') {
        router.push('/admin')
      } else if (status === 'PENDING') {
        router.push('/pending')
      } else {
        const returnTo = searchParams.get('returnTo')
        router.push(returnTo || '/')
      }
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
        <div className="muted">Sign in</div>
      </div>
      {error && <div className="error-text">{error}</div>}
      <label className="label">Email</label>
      <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="label">Password</label>
      <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn" style={{ width: '100%' }} onClick={submit} disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="center muted" style={{ marginTop: 12 }}>
        No account? <Link href="/register" style={{ color: 'var(--green)' }}>Register</Link>
      </p>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
