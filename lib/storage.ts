import { put } from '@vercel/blob'

const ALLOWED_KINDS = ['shop-logo', 'shop-cover', 'barber-photo'] as const
export type UploadKind = typeof ALLOWED_KINDS[number]

export function storageConfigured() {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN)
}

export async function uploadToBlob(opts: {
  kind: UploadKind
  file: Blob | File
  fileName: string
  contentType: string
}) {
  if (!storageConfigured()) throw new Error('Image uploads are not configured.')
  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const pathname = `${opts.kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
  const blob = await put(pathname, opts.file, {
    access: 'private',
    contentType: opts.contentType,
  })
  return blob.downloadUrl || blob.url
}
