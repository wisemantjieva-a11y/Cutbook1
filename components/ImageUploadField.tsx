'use client'
import { useState } from 'react'
import { uploadImage } from '@/lib/api'

export default function ImageUploadField({
  label,
  kind,
  currentUrl,
  onUploaded,
}: {
  label: string
  kind: 'shop-logo' | 'shop-cover' | 'barber-photo'
  currentUrl?: string | null
  onUploaded: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadImage(kind, file)
      onUploaded(url)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      {currentUrl && (
        <img src={currentUrl} alt={label} style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} disabled={uploading} />
      {uploading && <div className="muted">Uploading…</div>}
      {error && <div className="error-text">{error}</div>}
    </div>
  )
}
