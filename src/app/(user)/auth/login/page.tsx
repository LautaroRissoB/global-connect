'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Globe, Mail, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const t            = useTranslations('login')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(t('error'))
      setLoading(false)
      return
    }

    const redirectTo = searchParams.get('redirectTo') ?? '/explore'
    window.location.href = redirectTo
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in" style={{ maxWidth: 420, borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', padding: 'var(--space-8)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <Link href="/" className="auth-logo" style={{ color: 'var(--text)', marginBottom: '2rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: 'var(--primary)', padding: '0.35rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Global<span style={{ fontWeight: 300, color: 'var(--primary)' }}>Connect</span></span>
        </Link>

        <h1 className="auth-title" style={{ fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{t('title') || 'Bienvenido de vuelta'}</h1>
        <p className="auth-subtitle" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t('subtitle')}</p>

        {error && <div className="auth-feedback error" role="alert" style={{ background: 'rgba(224, 93, 67, 0.08)', border: '1px solid rgba(224, 93, 67, 0.3)', color: 'var(--accent)', borderRadius: 'var(--radius-xs)', padding: '0.75rem 1rem', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input id="email" label={t('email')} type="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            icon={Mail} required autoComplete="email" />

          <Input id="password" label={t('password')} type="password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            icon={Lock} required autoComplete="current-password" />

          <Button type="submit" loading={loading} size="lg" style={{ marginTop: '0.5rem', width: '100%', borderRadius: 'var(--radius-full)' }}>
            {loading ? t('loading') : t('submit')}
          </Button>
        </form>

        <p className="auth-footer" style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {t('no_account')}{' '}
          <Link href="/auth/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>{t('register_link')}</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
