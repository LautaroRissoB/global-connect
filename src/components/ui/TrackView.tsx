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

    const supabase = createClient()
    supabase.auth.getUser()
      .then(({ data: { user } }) =>
        supabase
          .from('events')
          .insert({ type, establishment_id: establishmentId, user_id: user?.id ?? null })
          .then(() => { sessionStorage.setItem(key, '1') })
      )
      .catch(() => {/* fire-and-forget: ignore tracking errors */})
  }, [establishmentId, type])

  return null
}
