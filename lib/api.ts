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

/** Uploads a File directly to object storage via a presigned URL. Returns the public URL. */
export async function uploadImage(kind: 'shop-logo' | 'shop-cover' | 'barber-photo', file: File) {
  const presign = await apiFetch('/api/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({ kind, fileName: file.name, contentType: file.type }),
  })
  const { uploadUrl, publicUrl } = presign.data

  const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
  if (!res.ok) throw new Error('Upload failed')

  return publicUrl as string
}
