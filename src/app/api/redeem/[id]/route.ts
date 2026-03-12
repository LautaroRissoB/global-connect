import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verify the saved_benefit belongs to this user and is not already redeemed
  const { data: benefit } = await supabase
    .from('saved_benefits')
    .select('id, user_id, promotion_id, establishment_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!benefit) return NextResponse.json({ error: 'Beneficio no encontrado' }, { status: 404 })
  if (benefit.status === 'redeemed') {
    return NextResponse.json({ error: 'Este beneficio ya fue canjeado' }, { status: 409 })
  }

  // Mark as redeemed
  await supabase
    .from('saved_benefits')
    .update({ status: 'redeemed' })
    .eq('id', id)

  // Create redemption record
  const { data: redemption } = await supabase
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
    await supabase
      .from('redemptions')
      .update({ rating })
      .eq('id', redemption.id)
  }

  return NextResponse.json({ success: true, redemptionId: redemption?.id })
}
