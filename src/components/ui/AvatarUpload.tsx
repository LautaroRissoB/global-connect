'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  avatarUrl: string | null
  initials: string
}

export default function AvatarUpload({ userId, avatarUrl, initials }: Props) {
  const inputRef            = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(avatarUrl)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const router = useRouter()

  // userId is used only to scope the upload path (handled server-side)
  void userId

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Optimistic preview
    const blobUrl = URL.createObjectURL(file)
    setPreview(blobUrl)
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/avatar', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) {
        setPreview(avatarUrl)         // revert
        setError(json.error ?? 'Error al subir la imagen')
      } else {
        setPreview(json.url)
        router.refresh()
      }
    } catch {
      setPreview(avatarUrl)
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* Avatar circle */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div
          style={{
            width: 96, height: 96, borderRadius: '50%',
            background: preview
              ? 'var(--bg-tertiary)'
              : 'linear-gradient(135deg, var(--primary), var(--secondary))',
            border: `3px solid ${error ? 'rgba(255,82,82,0.5)' : 'var(--card-border)'}`,
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

      {/* Error message */}
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
