import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AllCallsClient from './AllCallsClient'

export default async function AllCallsPage() {
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
    <AllCallsClient 
      userId={session.user.id} 
      companyId={user.company_id}
      companyName={user.companies?.name || 'החברה'}
    />
  )
} 