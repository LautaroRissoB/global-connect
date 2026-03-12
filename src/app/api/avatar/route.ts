import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const BUCKET = 'avatars'

export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const ext  = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const path = `${user.id}/avatar.${ext}`
  const bytes = await file.arrayBuffer()

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // With service role: ensure bucket exists, then upload
  if (serviceKey) {
    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // Create bucket if it doesn't exist
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.find((b) => b.name === BUCKET)) {
      await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 2097152,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      })
    }

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { upsert: true, contentType: file.type })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path)
    // Append cache-busting param so browsers reload the new image
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
    return NextResponse.json({ url: publicUrl })
  }

  // Without service role: try with user session (bucket must already exist)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { upsert: true, contentType: file.type })

  if (error) {
    return NextResponse.json(
      { error: 'El bucket de avatars no está configurado. Pedile al admin que ejecute la migración 003.' },
      { status: 500 }
    )
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
  return NextResponse.json({ url: publicUrl })
}
