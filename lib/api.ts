export async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  const json = await res.json().catch(() => ({ success: false, message: 'Invalid server response' }))
  if (!res.ok) {
    throw new Error(json.message || `Request failed (${res.status})`)
  }
  return json
}

export const money = (cents: number) => `N$${(cents / 100).toFixed(2)}`

/** Uploads a File to Vercel Blob via the server-side upload endpoint. Returns the public URL. */
export async function uploadImage(kind: 'shop-logo' | 'shop-cover' | 'barber-photo', file: File) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('kind', kind)

  const res = await fetch('/api/uploads/presign', {
    method: 'POST',
    credentials: 'include',
    body: formData, // browser sets Content-Type with boundary automatically
  })
  const json = await res.json().catch(() => ({ success: false, message: 'Invalid server response' }))
  if (!res.ok) throw new Error(json.message || `Upload failed (${res.status})`)
  return json.data.url as string
}
