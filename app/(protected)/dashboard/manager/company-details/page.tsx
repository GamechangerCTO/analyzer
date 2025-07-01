import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompanyDetailsClient from './CompanyDetailsClient'

export default async function CompanyDetailsPage() {
  const supabase = createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }

  // קבלת פרטי המשתמש
  const { data: user } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', session.user.id)
    .single()

  if (!user) {
    redirect('/login')
  }

  // בדיקה שהמשתמש הוא מנהל
  if (user.role !== 'manager') {
    redirect('/dashboard')
  }

  if (!user.company_id) {
    redirect('/dashboard')
  }

  return (
    <CompanyDetailsClient 
      userId={session.user.id} 
      companyId={user.company_id}
      userRole={user.role}
    />
  )
} 