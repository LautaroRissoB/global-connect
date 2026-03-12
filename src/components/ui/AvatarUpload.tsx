'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  avatarUrl: string | null
  initials: string
}

export default function AvatarUpload({ userId, avatarUrl, initials }: Props) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [preview, setPreview]   = useState<string | null>(avatarUrl)
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setLoading(true)

    const supabase = createClient()
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/avatar.${ext}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Avatar circle */}
      <div
        style={{
          width: 96, height: 96, borderRadius: '50%',
          background: preview
            ? 'var(--bg-tertiary)'
            : 'linear-gradient(135deg, var(--primary), var(--secondary))',
          border: '3px solid var(--card-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', margin: '0 auto',
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            {initials}
          </span>
        )}
      </div>

      {/* Camera button — bottom right */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        title="Cambiar foto"
        style={{
          position: 'absolute', bottom: 2, right: 2,
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--primary)', border: '2px solid var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? (
          <div style={{
            width: 10, height: 10,
            border: '2px solid rgba(255,255,255,0.4)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }} />
        ) : (
          <Camera size={13} style={{ color: '#fff' }} />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  )
}
