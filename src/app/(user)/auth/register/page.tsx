'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Globe, Mail, Lock, User, GraduationCap, MapPin, Building2, ChevronDown, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const BA_UNIVERSITIES = [
  'Universidad de Buenos Aires (UBA)',
  'Universidad Torcuato Di Tella (UTDT)',
  'Universidad de San Andrés (UdeSA)',
  'Universidad Austral',
  'ITBA – Instituto Tecnológico de Buenos Aires',
  'Universidad Católica Argentina (UCA)',
  'Universidad CEMA',
  'Universidad de Palermo (UP)',
  'ORT Argentina',
  'UADE – Universidad Argentina de la Empresa',
  'Universidad Abierta Interamericana (UAI)',
  'Universidad Nacional de San Martín (UNSAM)',
  'Universidad Nacional de Tres de Febrero (UNTREF)',
  'Otra / Other',
]

const COUNTRIES = [
  'Alemania / Germany', 'Argentina', 'Australia', 'Austria',
  'Bélgica / Belgium', 'Bolivia', 'Brasil / Brazil', 'Canadá / Canada',
  'Chile', 'China', 'Colombia', 'Corea del Sur / South Korea',
  'Costa Rica', 'Dinamarca / Denmark', 'Ecuador', 'España / Spain',
  'Estados Unidos / USA', 'Finlandia / Finland', 'Francia / France',
  'Grecia / Greece', 'Hungría / Hungary', 'India', 'Israel',
  'Italia / Italy', 'Japón / Japan', 'México / Mexico',
  'Noruega / Norway', 'Nueva Zelanda / New Zealand', 'Países Bajos / Netherlands',
  'Paraguay', 'Perú / Peru', 'Polonia / Poland', 'Portugal',
  'Reino Unido / UK', 'República Checa / Czech Republic',
  'Rumania / Romania', 'Rusia / Russia', 'Sudáfrica / South Africa',
  'Suecia / Sweden', 'Suiza / Switzerland', 'Turquía / Turkey',
  'Ucrania / Ukraine', 'Uruguay', 'Venezuela', 'Otro / Other',
]

function Dropdown({ label, icon: Icon, value, onChange, options, placeholder }: {
  label: string; icon: React.ElementType; value: string
  onChange: (val: string) => void; options: string[]; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 5 }}>
        <Icon size={13} /> {label}
      </label>
      <div ref={ref} style={{ position: 'relative' }}>
        <button type="button" onClick={() => setOpen((o) => !o)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 0.85rem', borderRadius: 'var(--radius)',
          border: `1px solid ${open ? 'var(--primary)' : 'var(--border)'}`,
          background: 'var(--surface)', color: value ? 'var(--text)' : 'var(--text-faint)',
          fontSize: '0.88rem', cursor: 'pointer', textAlign: 'left',
        }}>
          <span>{value || placeholder}</span>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 'var(--radius)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: 200, maxHeight: 220, overflowY: 'auto' }}>
            {options.map((opt) => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.85rem', background: opt === value ? 'rgba(43,136,216,0.1)' : 'transparent', color: opt === value ? 'var(--primary)' : 'var(--text)', fontSize: '0.88rem', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={(e) => { if (opt !== value) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)' }}
                onMouseLeave={(e) => { if (opt !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {opt}{opt === value && <Check size={13} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function RegisterPage() {
  const router = useRouter()
  const t      = useTranslations('register')

  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    homeUniversity: '', homeCountry: '',
    exchangeUniversity: '', customUniversity: '',
    exchangeCountry: 'Argentina', exchangeCity: 'Buenos Aires',
  })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function updateInput(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }
  function updateDropdown(field: keyof typeof form) {
    return (val: string) => setForm((prev) => ({ ...prev, [field]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!isValidEmail(form.email))                                              { setError(t('error_email'));           return }
    if (form.password.length < 8)                                               { setError(t('error_password'));        return }
    if (!form.homeCountry)                                                      { setError(t('error_country'));         return }
    if (!form.exchangeUniversity)                                               { setError(t('error_university'));      return }
    if (form.exchangeUniversity === 'Otra / Other' && !form.customUniversity.trim()) { setError(t('error_custom_university')); return }

    setLoading(true)
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (authError) { setError(authError.message); setLoading(false); return }

    if (data.user) {
      const finalUniversity = form.exchangeUniversity === 'Otra / Other'
        ? form.customUniversity.trim() : form.exchangeUniversity
      await supabase.from('profiles').insert({
        id: data.user.id, full_name: form.fullName,
        university: form.homeUniversity, exchange_university: finalUniversity,
        home_country: form.homeCountry, exchange_country: form.exchangeCountry,
        exchange_city: form.exchangeCity,
      })
    }

    setSuccess(true); setLoading(false)
    if (data.session) setTimeout(() => router.push('/explore'), 1500)
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.72rem', color: 'var(--text-faint)',
    textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0.5rem 0 -0.25rem',
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in" style={{ maxWidth: 540, borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', padding: 'var(--space-8)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <Link href="/" className="auth-logo" style={{ color: 'var(--text)', marginBottom: '2rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: 'var(--primary)', padding: '0.35rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Global<span style={{ fontWeight: 300, color: 'var(--primary)' }}>Connect</span></span>
        </Link>

        <h1 className="auth-title" style={{ fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{t('title') || 'Comenzá tu aventura'}</h1>
        <p className="auth-subtitle" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t('subtitle')}</p>

        {error   && <div className="auth-feedback error" role="alert" style={{ background: 'rgba(224, 93, 67, 0.08)', border: '1px solid rgba(224, 93, 67, 0.3)', color: 'var(--accent)', borderRadius: 'var(--radius-xs)', padding: '0.75rem 1rem', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="auth-feedback success" role="status" style={{ background: 'rgba(74, 138, 89, 0.08)', border: '1px solid rgba(74, 138, 89, 0.3)', color: 'var(--accent-green)', borderRadius: 'var(--radius-xs)', padding: '0.75rem 1rem', fontSize: '0.9rem', marginBottom: '1rem' }}>{t('success')}</div>}

        {!success && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <Input id="fullName" label={t('full_name')} type="text" value={form.fullName} onChange={updateInput('fullName')} icon={User} required autoComplete="name" />
            <Input id="email" label={t('email')} type="email" value={form.email} onChange={updateInput('email')} icon={Mail} required autoComplete="email" />
            <Input id="password" label={t('password')} type="password" value={form.password} onChange={updateInput('password')} icon={Lock} required autoComplete="new-password" minLength={8} />

            <p style={sectionLabel}>{t('section_academic')}</p>
            <Dropdown label={t('home_country')} icon={MapPin} value={form.homeCountry} onChange={updateDropdown('homeCountry')} options={COUNTRIES} placeholder={t('home_country_placeholder')} />
            <Input id="homeUniversity" label={t('home_university')} type="text" value={form.homeUniversity} onChange={updateInput('homeUniversity')} icon={GraduationCap} required />
            <Dropdown label={t('exchange_university')} icon={Building2} value={form.exchangeUniversity} onChange={updateDropdown('exchangeUniversity')} options={BA_UNIVERSITIES} placeholder={t('exchange_university_placeholder')} />
            {form.exchangeUniversity === 'Otra / Other' && (
              <Input id="customUniversity" label={t('custom_university')} type="text" value={form.customUniversity} onChange={updateInput('customUniversity')} icon={Building2} required />
            )}

            <p style={sectionLabel}>{t('section_destination')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Dropdown label={t('exchange_country')} icon={MapPin} value={form.exchangeCountry} onChange={updateDropdown('exchangeCountry')} options={COUNTRIES} placeholder={t('exchange_country')} />
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 5 }}>
                  <MapPin size={13} /> {t('city')}
                </label>
                <input type="text" value={form.exchangeCity} onChange={updateInput('exchangeCity')} required
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <Button type="submit" loading={loading} size="lg" style={{ marginTop: '0.5rem', width: '100%' }}>
              {loading ? t('loading') : t('submit')}
            </Button>
          </form>
        )}

        <p className="auth-footer">{t('has_account')}{' '}<Link href="/auth/login">{t('login_link')}</Link></p>
      </div>
    </div>
  )
}
