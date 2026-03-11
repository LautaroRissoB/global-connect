'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  establishmentId: string
  type?: string
}

export default function TrackView({ establishmentId, type = 'establishment_view' }: Props) {
  useEffect(() => {
    const key = `tracked_${type}_${establishmentId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    const supabase = createClient()
    supabase
      .from('events')
      .insert({ type, establishment_id: establishmentId })
      .then(() => {})
  }, [establishmentId, type])

  return null
}
