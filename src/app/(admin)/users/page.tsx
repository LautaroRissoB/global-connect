import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import UsersTable from '@/components/admin/UsersTable'

async function updateUser(id: string, data: {
  full_name: string
  university: string
  home_country: string
  exchange_country: string
  exchange_city: string
}) {
  'use server'
  const supabase = await createClient()
  await supabase.from('profiles').update(data).eq('id', id)
  revalidatePath('/users')
}

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, university, home_country, exchange_country, exchange_city, created_at')
    .order('created_at', { ascending: false })

  return (
    <>
      <h1 className="admin-page-title">Estudiantes</h1>
      <p className="admin-page-subtitle">Gestión y métricas de los estudiantes registrados en la plataforma.</p>
      <UsersTable users={users ?? []} updateUser={updateUser} />
    </>
  )
}
