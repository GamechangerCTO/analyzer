import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PersonaManagementClient from '@/components/PersonaManagementClient'

export const metadata = {
  title: 'ניהול פרסונות | מערכת אימון מכירות',
  description: 'ניהול פרסונות לקוחות לסימולציות',
}

export default async function PersonaManagementPage() {
  const supabase = createClient()

  // בדיקת הרשאות
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  const { data: user } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', session.user.id)
    .single()

  if (!user || (user.role !== 'manager' && user.role !== 'super_admin')) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ניהול פרסונות לקוחות
        </h1>
        <p className="text-gray-600">
          נהל את פרסונות הלקוחות הווירטואליים עבור סימולציות אימון
        </p>
      </div>

      <PersonaManagementClient 
        companyId={user.company_id} 
        companyName={user.companies?.name}
      />
    </div>
  )
}

