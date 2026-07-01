import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const BUCKET = process.env.S3_BUCKET
const PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL

export function storageConfigured() {
  return Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && BUCKET && PUBLIC_BASE_URL)
}

function client() {
  return new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined, // unset = real AWS S3; set = R2/B2/MinIO
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
    },
  })
}

/**
 * Returns a presigned PUT URL the browser can upload directly to, plus the
 * public URL the file will live at once uploaded. Key is namespaced by kind
 * + a random-ish suffix to avoid collisions.
 */
export async function createPresignedUpload(opts: { kind: string; fileName: string; contentType: string }) {
  if (!storageConfigured()) {
    throw new Error('Object storage is not configured. Set S3_* env vars to enable image uploads.')
  }
  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `${opts.kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: opts.contentType,
  })

  const uploadUrl = await getSignedUrl(client(), command, { expiresIn: 300 })
  const publicUrl = `${PUBLIC_BASE_URL?.replace(/\/$/, '')}/${key}`

  return { uploadUrl, publicUrl, key }
}
