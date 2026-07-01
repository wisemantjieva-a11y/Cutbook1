import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { createPresignedUpload, storageConfigured } from '@/lib/storage'

const ALLOWED_KINDS = ['shop-logo', 'shop-cover', 'barber-photo']
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_NAME_LEN = 200

// POST /api/uploads/presign  { kind, fileName, contentType }
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ success: false, message: 'Login required' }, { status: 401 })

  if (!storageConfigured()) {
    return NextResponse.json(
      { success: false, message: 'Image uploads are not configured yet. Set S3_* env vars to enable this.' },
      { status: 503 }
    )
  }

  const { kind, fileName, contentType } = await req.json()
  if (!ALLOWED_KINDS.includes(kind)) {
    return NextResponse.json({ success: false, message: `kind must be one of ${ALLOWED_KINDS.join(', ')}` }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ success: false, message: 'Only JPEG, PNG, or WebP images are allowed' }, { status: 400 })
  }
  if (!fileName || fileName.length > MAX_NAME_LEN) {
    return NextResponse.json({ success: false, message: 'Invalid file name' }, { status: 400 })
  }

  const { uploadUrl, publicUrl } = await createPresignedUpload({ kind, fileName, contentType })
  return NextResponse.json({ success: true, data: { uploadUrl, publicUrl } })
}
