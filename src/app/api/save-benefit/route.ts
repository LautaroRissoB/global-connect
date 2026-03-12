import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { promotionId, establishmentId } = await request.json()
  if (!promotionId || !establishmentId) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  // Check establishment redemption mode
  const { data: establishment } = await supabase
    .from('establishments')
    .select('redemption_mode')
    .eq('id', establishmentId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mode = (establishment as any)?.redemption_mode ?? 'one_per_promo'

  if (mode === 'one_per_establishment') {
    // Check if user already has any saved/redeemed benefit from this establishment
    const { data: existing } = await supabase
      .from('saved_benefits')
      .select('id')
      .eq('user_id', user.id)
      .eq('establishment_id', establishmentId)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Solo podés guardar un beneficio por establecimiento' },
        { status: 409 }
      )
    }
  }

  // Upsert: ignore if already saved
  const { data, error } = await supabase
    .from('saved_benefits')
    .upsert(
      { user_id: user.id, promotion_id: promotionId, establishment_id: establishmentId, status: 'saved' },
      { onConflict: 'user_id,promotion_id', ignoreDuplicates: true }
    )
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data?.id ?? null })
}
