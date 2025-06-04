import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CompanyDetailsClient from './CompanyDetailsClient'

export default async function CompanyDetailsPage() {
  const supabase = createServerComponentClient({ cookies })
  
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
  if (user.role !== 'manager' && user.role !== 'owner') {
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