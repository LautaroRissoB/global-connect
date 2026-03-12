import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { promotionId, establishmentId } = await request.json()
  if (!promotionId || !establishmentId) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const { data: establishment } = await supabase
    .from('establishments')
    .select('redemption_mode')
    .eq('id', establishmentId)
    .single()

  const mode = (establishment as any)?.redemption_mode ?? 'one_per_promo'

  if (mode === 'one_per_establishment') {
    const { data: existing } = await db
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

  const { data, error } = await db
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
