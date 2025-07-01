import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CallsListClient from './CallsListClient'

interface CallsPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function CallsPage({ searchParams }: CallsPageProps) {
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

  // קבלת פרמטר agent מה-URL
  const agentId = searchParams.agent as string | undefined

  return (
    <CallsListClient 
      userId={user.id} 
      companyId={user.company_id}
      userRole={user.role}
      filterByAgent={agentId}
    />
  )
} 