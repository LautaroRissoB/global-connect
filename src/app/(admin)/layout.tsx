import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/Sidebar'
import './admin.css'

export const metadata = { title: 'Admin — Global Connect' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Verificar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verificar que sea admin (doble chequeo server-side, proxy.ts ya filtra)
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminUser) redirect('/')

  return (
    <div className="admin-wrap">
      <AdminSidebar email={user.email ?? ''} />

      <div className="admin-main">
        <header className="admin-header">
          <span className="admin-header-title">Global Connect — Panel de Administración</span>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  )
}
