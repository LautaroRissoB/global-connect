import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import ExploreClient from './ExploreClient'
import type { Establishment } from './ExploreClient'

export const revalidate = 60 // ISR: revalidar cada 60 segundos

export const metadata: Metadata = {
  title: 'Explorar establecimientos | Global Connect',
  description: 'Descubrí restaurantes, bares, cafeterías y más con beneficios exclusivos para estudiantes internacionales en Buenos Aires.',
}

export default async function ExplorePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceClient = createServiceClient() as any

  const [{ data }, { data: rawRatings }] = await Promise.all([
    supabase
      .from('establishments')
      .select(`id, name, category, city, country, image_url, price_range, plan,
        promotions ( discounted_price, original_price, discount_percentage, is_active )`)
      .eq('is_active', true)
      .order('name'),
    serviceClient.from('redemptions').select('establishment_id, rating').not('rating', 'is', null),
  ])

  // Compute avg rating per establishment
  const ratingMap: Record<string, number[]> = {}
  const ratingRows = (rawRatings ?? []) as { establishment_id: string; rating: number }[]
  for (const r of ratingRows) {
    if (!r.establishment_id) continue
    if (!ratingMap[r.establishment_id]) ratingMap[r.establishment_id] = []
    ratingMap[r.establishment_id].push(r.rating)
  }

  const establishments: Establishment[] = (data ?? []).map((e) => ({
    ...(e as Establishment),
    avgRating: ratingMap[e.id]?.length
      ? (ratingMap[e.id].reduce((s: number, v: number) => s + v, 0) / ratingMap[e.id].length).toFixed(1)
      : null,
  }))

  return (
    <>
      <Navbar />
      <ExploreClient establishments={establishments} />
    </>
  )
}
