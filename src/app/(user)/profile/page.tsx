import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { MapPin, GraduationCap, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import AvatarUpload from '@/components/ui/AvatarUpload'
import ProfileCompleteForm from '@/components/ui/ProfileCompleteForm'
import ProfileTabs from '@/components/ui/ProfileTabs'

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

  // Fetch saved benefits + redemptions (graceful if tables don't exist yet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawBenefits: any[] | null = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawRedemptions: any[] | null = []
  try {
    const [benefitsRes, redemptionsRes] = await Promise.all([
      s.from('saved_benefits')
        .select('id, saved_at, status, promotion_id, establishment_id, promotions(title, discount_percentage, valid_until), establishments(name, category)')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false }),
      s.from('redemptions')
        .select('id, redeemed_at, rating, promotion_id, promotions(title, discount_percentage), establishments(name)')
        .eq('user_id', user.id)
        .order('redeemed_at', { ascending: false }),
    ])
    rawBenefits = benefitsRes.data
    rawRedemptions = redemptionsRes.data
  } catch {
    // Tables may not exist yet
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedBenefits = (rawBenefits ?? []).map((b: any) => ({
    id: b.id, saved_at: b.saved_at, status: b.status,
    establishment_id: b.establishment_id ?? null,
    promo_title: b.promotions?.title ?? '',
    promo_discount: b.promotions?.discount_percentage ?? null,
    valid_until: b.promotions?.valid_until ?? null,
    establishment_name: b.establishments?.name ?? '',
    establishment_category: b.establishments?.category ?? '',
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const redemptions = (rawRedemptions ?? []).map((r: any) => ({
    id: r.id, redeemed_at: r.redeemed_at, rating: r.rating,
    promo_title: r.promotions?.title ?? '',
    promo_discount: r.promotions?.discount_percentage ?? null,
    establishment_name: r.establishments?.name ?? '',
  }))

  // ── Server action: create profile for authenticated user ──
  async function createProfile(formData: FormData) {
    'use server'
    const s = await createClient()
    const { data: { user: u } } = await s.auth.getUser()
    if (!u) return

    await s.from('profiles').insert({
      id: u.id,
      full_name: formData.get('full_name') as string,
      university: formData.get('university') as string,
      home_country: formData.get('home_country') as string,
      exchange_country: 'Argentina',
      exchange_city: 'Buenos Aires',
    })

    const exchangeUniv = formData.get('exchange_university') as string
    if (exchangeUniv) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await s.from('profiles').update({ exchange_university: exchangeUniv } as any).eq('id', u.id)
    }

    redirect('/profile')
  }


  // ── No profile: show completion form ──
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
  const p = profile as any
  const exchangeUniversity = p.exchange_university as string | null
  // Profile tab content (passed as prop to avoid re-fetching)
  const profileContent = (
    <div>
      {/* ── Info cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
        {profile.home_country && (
          <InfoRow icon={MapPin} label="País de origen" value={profile.home_country} />
        )}
        {profile.university && (
          <InfoRow icon={GraduationCap} label="Universidad de origen" value={profile.university} />
        )}
        {exchangeUniversity && (
          <InfoRow icon={Building2} label="Universidad en Buenos Aires" value={exchangeUniversity} accent />
        )}
      </div>

    </div>
  )

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 1rem 5rem' }}>

        {/* ── Header (always visible) ── */}
        <div style={{ textAlign: 'center', padding: '2rem 0 1.5rem' }}>
          <AvatarUpload userId={user.id} avatarUrl={profile.avatar_url} initials={initials} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, margin: '0.875rem 0 0.3rem', color: 'var(--text)' }}>
            {profile.full_name}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
            Miembro desde {formatJoinDate(profile.created_at)}
          </p>
        </div>

        <Suspense>
          <ProfileTabs
            profileContent={profileContent}
            savedBenefits={savedBenefits}
            redemptions={redemptions}
          />
        </Suspense>
      </div>
    </>
  )
}
