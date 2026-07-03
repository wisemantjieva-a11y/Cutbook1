'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch, money } from '@/lib/api'
import HoursEditor from '@/components/HoursEditor'
import ImageUploadField from '@/components/ImageUploadField'

export default function Settings() {
  const [me, setMe] = useState<any>(null)
  const [shop, setShop] = useState<any>(null)
  const [barber, setBarber] = useState<any>(null)
  const [allShops, setAllShops] = useState<any[]>([])
  const [myJoinRequests, setMyJoinRequests] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  const [shopForm, setShopForm] = useState({ name: '', area: '', address: '', phone: '', description: '', category: 'BARBERSHOP' })
  const [barberForm, setBarberForm] = useState({ bio: '', category: 'BARBERSHOP', isMobile: true, houseCallFeeInCents: 0, travelRadiusKm: 10, baseLatitude: '', baseLongitude: '' })
  const [svc, setSvc] = useState({ name: '', priceInCents: 0, durationMin: 30, allowsHouseCall: false })

  async function loadAll() {
    const r = await apiFetch('/api/auth/me')
    setMe(r.data)

    if (r.data?.shops?.[0]) {
      const s = await apiFetch(`/api/shops/${r.data.shops[0].id}`)
      setShop(s.data)
      const pending = await apiFetch(`/api/shops/${r.data.shops[0].id}/join-requests`)
      setPendingRequests(pending.data)
    }

    if (r.data?.barberProfile) {
      const b = await apiFetch(`/api/barbers/${r.data.barberProfile.id}`)
      setBarber(b.data)
      setBarberForm({
        bio: b.data.bio || '',
        category: b.data.category || 'BARBERSHOP',
        isMobile: b.data.isMobile,
        houseCallFeeInCents: b.data.houseCallFeeInCents,
        travelRadiusKm: b.data.travelRadiusKm || 10,
        baseLatitude: b.data.baseLatitude ?? '',
        baseLongitude: b.data.baseLongitude ?? '',
      })

      if (!b.data.shopId) {
        const shops = await apiFetch('/api/shops')
        setAllShops(shops.data)
        const mine = await apiFetch('/api/join-requests')
        setMyJoinRequests(mine.data)
      }
    }
  }

  useEffect(() => { loadAll().catch((e) => setError(e.message)) }, [])

  async function createShop() {
    setError(''); setSaved('')
    try {
      await apiFetch('/api/shops', { method: 'POST', body: JSON.stringify(shopForm) })
      setSaved('Shop created!')
      await loadAll()
    } catch (e: any) { setError(e.message) }
  }

  async function saveBarberProfile() {
    setError(''); setSaved('')
    try {
      await apiFetch(`/api/barbers/${barber.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...barberForm,
          baseLatitude: barberForm.baseLatitude === '' ? null : Number(barberForm.baseLatitude),
          baseLongitude: barberForm.baseLongitude === '' ? null : Number(barberForm.baseLongitude),
        }),
      })
      setSaved('Profile saved!')
      await loadAll()
    } catch (e: any) { setError(e.message) }
  }

  async function addService() {
    setError(''); setSaved('')
    try {
      await apiFetch('/api/services', {
        method: 'POST',
        body: JSON.stringify({ ...svc, shopId: shop?.id, barberId: barber?.id }),
      })
      setSaved('Service added!')
      setSvc({ name: '', priceInCents: 0, durationMin: 30, allowsHouseCall: false })
      await loadAll()
    } catch (e: any) { setError(e.message) }
  }

  async function requestToJoin(shopId: string) {
    setError(''); setSaved('')
    try {
      await apiFetch(`/api/shops/${shopId}/join-requests`, { method: 'POST', body: JSON.stringify({}) })
      setSaved('Request sent!')
      await loadAll()
    } catch (e: any) { setError(e.message) }
  }

  async function decideRequest(requestId: string, decision: 'APPROVED' | 'REJECTED') {
    setError(''); setSaved('')
    try {
      await apiFetch(`/api/shops/${shop.id}/join-requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ decision }) })
      setSaved(decision === 'APPROVED' ? 'Stylist added to your shop!' : 'Request rejected')
      await loadAll()
    } catch (e: any) { setError(e.message) }
  }

  async function updateShopImage(field: 'logoUrl' | 'coverUrl', url: string) {
    await apiFetch(`/api/shops/${shop.id}`, { method: 'PATCH', body: JSON.stringify({ [field]: url }) })
    await loadAll()
  }

  async function updateBarberPhoto(url: string) {
    await apiFetch(`/api/barbers/${barber.id}`, { method: 'PATCH', body: JSON.stringify({ photoUrl: url }) })
    await loadAll()
  }

  if (!me) return <div className="container p-1 center muted">Loading…</div>

  return (
    <div className="container">
      <div className="header">
        <Link href="/dashboard" className="muted" style={{ color: 'rgba(255,255,255,.8)' }}>← Back</Link>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>Settings</div>
      </div>

      <div className="p-1">
        {error && <div className="error-text">{error}</div>}
        {saved && <div className="muted" style={{ color: 'var(--green)', marginBottom: 12 }}>{saved}</div>}

        {me.role === 'SHOP_OWNER' && !shop && (
          <div className="card">
            <div className="label">Set up your shop</div>
            <input className="input" placeholder="Shop name" value={shopForm.name} onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })} />
            <input className="input" placeholder="Area (e.g. Khomasdal)" value={shopForm.area} onChange={(e) => setShopForm({ ...shopForm, area: e.target.value })} />
            <input className="input" placeholder="Street address" value={shopForm.address} onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })} />
            <input className="input" placeholder="Phone" value={shopForm.phone} onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })} />
            <label className="label">Category</label>
            <select className="input" value={shopForm.category} onChange={(e) => setShopForm({ ...shopForm, category: e.target.value })}>
              <option value="BARBERSHOP">Barbershop</option>
              <option value="SALON">Salon</option>
              <option value="BOTH">Barbershop &amp; Salon</option>
            </select>
            <textarea className="input" placeholder="Description" value={shopForm.description} onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })} />
            <button className="btn" style={{ width: '100%' }} onClick={createShop}>Create shop</button>
          </div>
        )}

        {shop && (
          <>
            <div className="card">
              <div style={{ fontWeight: 500 }}>{shop.name}</div>
              <div className="muted">{shop.area} · {shop.address}</div>
              <label className="label">Category</label>
              <select
                className="input"
                value={shop.category}
                onChange={async (e) => { await apiFetch(`/api/shops/${shop.id}`, { method: 'PATCH', body: JSON.stringify({ category: e.target.value }) }); await loadAll() }}
              >
                <option value="BARBERSHOP">Barbershop</option>
                <option value="SALON">Salon</option>
                <option value="BOTH">Barbershop &amp; Salon</option>
              </select>
              {shop.subscription && (
                <div className="muted" style={{ marginTop: 6 }}>
                  {shop.subscription.status === 'TRIALING'
                    ? `Free trial — ends ${new Date(shop.subscription.trialEndsAt).toLocaleDateString('en-NA', { dateStyle: 'medium' })}`
                    : shop.subscription.status === 'ACTIVE'
                    ? `Subscribed — paid through ${new Date(shop.subscription.currentPeriodEnd).toLocaleDateString('en-NA', { dateStyle: 'medium' })}`
                    : `Subscription: ${shop.subscription.status}`}
                </div>
              )}
            </div>

            <div className="card">
              <ImageUploadField label="Shop logo" kind="shop-logo" currentUrl={shop.logoUrl} onUploaded={(url) => updateShopImage('logoUrl', url)} />
              <ImageUploadField label="Cover photo" kind="shop-cover" currentUrl={shop.coverUrl} onUploaded={(url) => updateShopImage('coverUrl', url)} />
            </div>

            <HoursEditor ownerType="shop" ownerId={shop.id} />

            {pendingRequests.length > 0 && (
              <div className="card">
                <div className="label">Stylists wanting to join</div>
                {pendingRequests.map((r: any) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{r.barber.user.name}</div>
                      <div className="muted">{r.barber.user.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => decideRequest(r.id, 'APPROVED')}>Approve</button>
                      <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => decideRequest(r.id, 'REJECTED')}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {barber && (
          <div className="card">
            <div className="label">Your stylist profile</div>
            {barber.subscription && (
              <div className="muted" style={{ marginBottom: 10 }}>
                {barber.subscription.status === 'TRIALING'
                  ? `Free trial — ends ${new Date(barber.subscription.trialEndsAt).toLocaleDateString('en-NA', { dateStyle: 'medium' })}`
                  : barber.subscription.status === 'ACTIVE'
                  ? `Subscribed — paid through ${new Date(barber.subscription.currentPeriodEnd).toLocaleDateString('en-NA', { dateStyle: 'medium' })}`
                  : `Subscription: ${barber.subscription.status}`}
              </div>
            )}
            <ImageUploadField label="Photo" kind="barber-photo" currentUrl={barber.photoUrl} onUploaded={updateBarberPhoto} />
            <textarea className="input" placeholder="Bio" value={barberForm.bio} onChange={(e) => setBarberForm({ ...barberForm, bio: e.target.value })} />
            <label className="label">Category</label>
            <select className="input" value={barberForm.category} onChange={(e) => setBarberForm({ ...barberForm, category: e.target.value })}>
              <option value="BARBERSHOP">Barber</option>
              <option value="SALON">Salon stylist</option>
              <option value="BOTH">Both</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" checked={barberForm.isMobile} onChange={(e) => setBarberForm({ ...barberForm, isMobile: e.target.checked })} />
              I offer house calls
            </label>
            {barberForm.isMobile && (
              <>
                <label className="label">Callout fee (N$)</label>
                <input className="input" type="number" value={barberForm.houseCallFeeInCents / 100}
                  onChange={(e) => setBarberForm({ ...barberForm, houseCallFeeInCents: Math.round(Number(e.target.value) * 100) })} />
                <label className="label">Travel radius (km)</label>
                <input className="input" type="number" value={barberForm.travelRadiusKm}
                  onChange={(e) => setBarberForm({ ...barberForm, travelRadiusKm: Number(e.target.value) })} />
                <label className="label">Base latitude</label>
                <input className="input" value={barberForm.baseLatitude} onChange={(e) => setBarberForm({ ...barberForm, baseLatitude: e.target.value })} placeholder="-22.5609" />
                <label className="label">Base longitude</label>
                <input className="input" value={barberForm.baseLongitude} onChange={(e) => setBarberForm({ ...barberForm, baseLongitude: e.target.value })} placeholder="17.0658" />
              </>
            )}
            <button className="btn" style={{ width: '100%' }} onClick={saveBarberProfile}>Save profile</button>
          </div>
        )}

        {barber && <HoursEditor ownerType="barber" ownerId={barber.id} />}

        {barber && !barber.shopId && (
          <div className="card">
            <div className="label">Join a shop</div>
            {myJoinRequests.filter((r) => r.status === 'PENDING').map((r) => (
              <div key={r.id} className="muted" style={{ marginBottom: 6 }}>⏳ Pending request to {r.shop.name}</div>
            ))}
            {allShops.map((s) => {
              const already = myJoinRequests.find((r) => r.shop.id === s.id && r.status === 'PENDING')
              return (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{s.name}</div>
                    <div className="muted">{s.area}</div>
                  </div>
                  <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 12 }} disabled={!!already} onClick={() => requestToJoin(s.id)}>
                    {already ? 'Requested' : 'Request to join'}
                  </button>
                </div>
              )
            })}
            {allShops.length === 0 && <p className="muted">No shops listed yet.</p>}
          </div>
        )}

        {(shop || barber) && (
          <div className="card">
            <div className="label">Add a service</div>
            <input className="input" placeholder="Service name" value={svc.name} onChange={(e) => setSvc({ ...svc, name: e.target.value })} />
            <label className="label">Price (N$)</label>
            <input className="input" type="number" value={svc.priceInCents / 100} onChange={(e) => setSvc({ ...svc, priceInCents: Math.round(Number(e.target.value) * 100) })} />
            <label className="label">Duration (minutes)</label>
            <input className="input" type="number" value={svc.durationMin} onChange={(e) => setSvc({ ...svc, durationMin: Number(e.target.value) })} />
            {barber?.isMobile && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input type="checkbox" checked={svc.allowsHouseCall} onChange={(e) => setSvc({ ...svc, allowsHouseCall: e.target.checked })} />
                Available as house call
              </label>
            )}
            <button className="btn" style={{ width: '100%' }} onClick={addService}>Add service</button>

            <div style={{ marginTop: 12 }}>
              {(shop?.services || barber?.services || []).map((s: any) => (
                <div key={s.id} className="muted" style={{ marginBottom: 4 }}>• {s.name} — {money(s.priceInCents)}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
