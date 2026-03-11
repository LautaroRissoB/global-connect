import { Suspense } from 'react'
import HomeFeed from '@/components/ui/HomeFeed'
import Navbar from '@/components/ui/Navbar'
import { createClient } from '@/lib/supabase/server'

async function getEstablishments() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('establishments')
    .select(`
      id, name, category, city, country, image_url, price_range,
      promotions ( discounted_price, original_price, discount_percentage, is_active )
    `)
    .eq('is_active', true)
    .order('name')

  return data ?? []
}

export default async function HomePage() {
  const establishments = await getEstablishments()

  return (
    <>
      <Navbar />
      <Suspense fallback={null}>
        <HomeFeed establishments={establishments} />
      </Suspense>
    </>
  )
}
