import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RedeemScreen from './RedeemScreen'

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurante', bar: 'Bar', club: 'Discoteca',
  cafe: 'Cafetería', cultural: 'Cultura', theater: 'Teatro',
  sports: 'Deportes', other: 'Otro',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function RedeemPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: benefit } = await (supabase as any)
    .from('saved_benefits')
    .select(`
      id, status,
      promotions ( id, title, description, discount_percentage, discounted_price, original_price, terms_conditions ),
      establishments ( id, name, category )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!benefit) notFound()
  if (benefit.status === 'redeemed') redirect('/profile?tab=history')

  const promo = benefit.promotions
  const est   = benefit.establishments

  return (
    <RedeemScreen
      benefitId={benefit.id}
      establishmentName={est.name}
      establishmentCategory={CATEGORY_LABELS[est.category] ?? est.category}
      promoTitle={promo.title}
      promoDescription={promo.description}
      discountPercentage={promo.discount_percentage}
      discountedPrice={promo.discounted_price}
      originalPrice={promo.original_price}
      termsConditions={promo.terms_conditions}
    />
  )
}
