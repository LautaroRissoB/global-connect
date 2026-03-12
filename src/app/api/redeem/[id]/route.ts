import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: benefit } = await db
    .from('saved_benefits')
    .select('id, user_id, promotion_id, establishment_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!benefit) return NextResponse.json({ error: 'Beneficio no encontrado' }, { status: 404 })
  if (benefit.status === 'redeemed') {
    return NextResponse.json({ error: 'Este beneficio ya fue canjeado' }, { status: 409 })
  }

  await db
    .from('saved_benefits')
    .update({ status: 'redeemed' })
    .eq('id', id)

  const { data: redemption } = await db
    .from('redemptions')
    .insert({
      saved_benefit_id: benefit.id,
      user_id: user.id,
      promotion_id: benefit.promotion_id,
      establishment_id: benefit.establishment_id,
    })
    .select('id')
    .single()

  const { rating } = await request.json().catch(() => ({ rating: null }))
  if (rating && redemption) {
    await db
      .from('redemptions')
      .update({ rating })
      .eq('id', redemption.id)
  }

  return NextResponse.json({ success: true, redemptionId: redemption?.id })
}
