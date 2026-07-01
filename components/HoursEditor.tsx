'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type DayHours = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }

export default function HoursEditor({ ownerType, ownerId }: { ownerType: 'shop' | 'barber'; ownerId: string }) {
  const [hours, setHours] = useState<DayHours[]>(
    DAYS.map((_, i) => ({ dayOfWeek: i, openTime: '08:00', closeTime: '18:00', isClosed: i === 0 }))
  )
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch(`/api/${ownerType}s/${ownerId}/hours`).then((r) => {
      if (r.data.length === 0) return // keep defaults
      setHours(
        DAYS.map((_, i) => {
          const existing = r.data.find((h: DayHours) => h.dayOfWeek === i)
          return existing || { dayOfWeek: i, openTime: '08:00', closeTime: '18:00', isClosed: i === 0 }
        })
      )
    })
  }, [ownerType, ownerId])

  function update(i: number, patch: Partial<DayHours>) {
    setHours((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)))
  }

  async function save() {
    setError(''); setSaved(false)
    try {
      await apiFetch(`/api/${ownerType}s/${ownerId}/hours`, { method: 'PUT', body: JSON.stringify({ hours }) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="card">
      <div className="label">Business hours</div>
      {error && <div className="error-text">{error}</div>}
      {hours.map((h, i) => (
        <div key={h.dayOfWeek} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ width: 34, fontSize: 13 }}>{DAYS[h.dayOfWeek]}</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <input type="checkbox" checked={!h.isClosed} onChange={(e) => update(i, { isClosed: !e.target.checked })} />
            Open
          </label>
          {!h.isClosed && (
            <>
              <input
                type="time" value={h.openTime} onChange={(e) => update(i, { openTime: e.target.value })}
                style={{ width: 90, padding: 4, fontSize: 12, margin: 0 }}
              />
              <span style={{ fontSize: 12 }}>–</span>
              <input
                type="time" value={h.closeTime} onChange={(e) => update(i, { closeTime: e.target.value })}
                style={{ width: 90, padding: 4, fontSize: 12, margin: 0 }}
              />
            </>
          )}
        </div>
      ))}
      <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={save}>
        {saved ? 'Saved!' : 'Save hours'}
      </button>
    </div>
  )
}
