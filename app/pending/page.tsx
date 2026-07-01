'use client'
import { useEffect, useState } from 'react'

export default function PendingPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setUser(d.data)
    }).catch(() => {})
  }, [])

  const roleLabel = user?.role === 'SHOP_OWNER' ? 'shop owner' : 'barber'

  return (
    <div className="container" style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: '1rem' }}>✂️</div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '0.5rem' }}>
        Account Pending Approval
      </h1>
      {user && (
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Hi {user.name}, your {roleLabel} account is under review.
        </p>
      )}
      <p className="muted" style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Our team will verify your details and approve your account shortly.
        Once approved, you&apos;ll have full access and a monthly subscription fee of{' '}
        <strong>N$300</strong> will apply.
      </p>
      <p className="muted" style={{ fontSize: 13 }}>
        Questions? Email{' '}
        <a href="mailto:wisemantjieva@gmail.com" style={{ color: 'var(--green)' }}>
          wisemantjieva@gmail.com
        </a>
      </p>
    </div>
  )
}
