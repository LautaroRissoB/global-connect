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

/** Resize and compress an image file to a small JPEG base64 data URL */
function resizeToDataUrl(file: File, size = 192): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas  = document.createElement('canvas')
      canvas.width  = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      // Crop to square (center)
      const s = Math.min(img.width, img.height)
      const ox = (img.width  - s) / 2
      const oy = (img.height - s) / 2
      ctx.drawImage(img, ox, oy, s, s, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function AvatarUpload({ userId, avatarUrl, initials }: Props) {
  const inputRef              = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(avatarUrl)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const router = useRouter()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      // Resize to 192×192 JPEG and convert to base64
      const dataUrl = await resizeToDataUrl(file)
      setPreview(dataUrl)

      // Save directly to the avatar_url column
      const supabase = createClient()
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: dataUrl })
        .eq('id', userId)

      if (dbError) {
        setPreview(avatarUrl)
        setError('No se pudo guardar la foto. Intentá de nuevo.')
      } else {
        router.refresh()
      }
    } catch {
      setPreview(avatarUrl)
      setError('Error al procesar la imagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Avatar circle */}
        <div
          style={{
            width: 96, height: 96, borderRadius: '50%',
            background: preview
              ? 'var(--bg-tertiary)'
              : 'linear-gradient(135deg, var(--primary), var(--secondary))',
            border: `3px solid ${error ? 'rgba(255,82,82,0.5)' : 'var(--card-border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
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

        {/* Camera button */}
        <button
          type="button"
          onClick={() => { setError(null); inputRef.current?.click() }}
          disabled={loading}
          title="Cambiar foto"
          style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 28, height: 28, borderRadius: '50%',
            background: error ? 'rgba(255,82,82,0.9)' : 'var(--primary)',
            border: '2px solid var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background 0.15s',
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
      </div>

      {error && (
        <p style={{ fontSize: '0.75rem', color: '#ff5252', maxWidth: 200, textAlign: 'center', lineHeight: 1.4 }}>
          {error}
        </p>
      )}

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
