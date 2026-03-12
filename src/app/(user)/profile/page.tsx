import { redirect } from 'next/navigation'
import { MapPin, GraduationCap, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import AvatarUpload from '@/components/ui/AvatarUpload'
import ProfileCompleteForm from '@/components/ui/ProfileCompleteForm'

function formatJoinDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

interface InfoRowProps {
  icon: React.ElementType
  label: string
  value: string
  accent?: boolean
}

function InfoRow({ icon: Icon, label, value, accent }: InfoRowProps) {
  return (
    <div
      className="glass"
      style={{
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.125rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 'var(--radius)',
        background: accent ? 'rgba(0,206,201,0.12)' : 'rgba(108,92,231,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={17} style={{ color: accent ? 'var(--secondary)' : 'var(--primary-light)' }} />
      </div>
      <div>
        <div style={{
          fontSize: '0.7rem', color: 'var(--text-faint)',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3,
        }}>
          {label}
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>
          {value}
        </div>
      </div>
    </div>
  )
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Server action: create profile for authenticated user
  async function createProfile(formData: FormData) {
    'use server'
    const supabaseServer = await createClient()
    const { data: { user: u } } = await supabaseServer.auth.getUser()
    if (!u) return

    await supabaseServer.from('profiles').insert({
      id: u.id,
      full_name: formData.get('full_name') as string,
      university: formData.get('university') as string,
      home_country: formData.get('home_country') as string,
      exchange_country: 'Argentina',
      exchange_city: 'Buenos Aires',
    })

    // Try to also set exchange_university (column may or may not exist)
    const exchangeUniv = formData.get('exchange_university') as string
    if (exchangeUniv) {
      await supabaseServer
        .from('profiles')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ exchange_university: exchangeUniv } as any)
        .eq('id', u.id)
    }

    redirect('/profile')
  }

  if (!profile) {
    return (
      <>
        <Navbar />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '2.5rem 1rem 5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.4rem' }}>
              Completá tu perfil
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Necesitamos algunos datos para mostrarte tu perfil.
            </p>
          </div>
          <ProfileCompleteForm action={createProfile} />
        </div>
      </>
    )
  }

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exchangeUniversity = (profile as any).exchange_university as string | null

  return (
    <>
      <Navbar />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '2.5rem 1rem 5rem' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <AvatarUpload
            userId={user.id}
            avatarUrl={profile.avatar_url}
            initials={initials}
          />
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem', fontWeight: 800,
            margin: '0.875rem 0 0.3rem', color: 'var(--text)',
          }}>
            {profile.full_name}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
            Miembro desde {formatJoinDate(profile.created_at)}
          </p>
        </div>

        {/* ── Info cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {profile.home_country && (
            <InfoRow
              icon={MapPin}
              label="País de origen"
              value={profile.home_country}
            />
          )}

          {profile.university && (
            <InfoRow
              icon={GraduationCap}
              label="Universidad de origen"
              value={profile.university}
            />
          )}

          {exchangeUniversity && (
            <InfoRow
              icon={Building2}
              label="Universidad en Buenos Aires"
              value={exchangeUniversity}
              accent
            />
          )}
        </div>

      </div>
    </>
  )
}
