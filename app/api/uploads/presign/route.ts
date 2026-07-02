import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { uploadToBlob, storageConfigured } from '@/lib/storage'

const ALLOWED_KINDS = ['shop-logo', 'shop-cover', 'barber-photo']
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// POST /api/uploads/presign  multipart/form-data: { file: File, kind: string }
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ success: false, message: 'Login required' }, { status: 401 })

    if (!storageConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Image uploads are not configured.' },
        { status: 503 }
      )
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const kind = form.get('kind') as string | null

    if (!file || !kind) {
      return NextResponse.json({ success: false, message: 'file and kind are required' }, { status: 400 })
    }
    if (!ALLOWED_KINDS.includes(kind)) {
      return NextResponse.json({ success: false, message: `kind must be one of ${ALLOWED_KINDS.join(', ')}` }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, message: 'Only JPEG, PNG, or WebP images are allowed' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, message: 'File too large (max 5 MB)' }, { status: 400 })
    }

    const url = await uploadToBlob({ kind: kind as any, file, fileName: file.name, contentType: file.type })
    return NextResponse.json({ success: true, data: { url } })
  } catch (err: any) {
    const msg = err?.message || String(err)
    console.error('[upload] error:', msg)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
