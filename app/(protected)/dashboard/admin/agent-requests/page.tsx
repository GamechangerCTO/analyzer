import React from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import AgentRequestsClient from '@/components/admin/AgentRequestsClient'

export default async function AgentRequestsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user || error) {
    redirect('/login')
  }
  
  // בדיקה שהמשתמש הוא מנהל מערכת
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()
  
  if (userError || !userData) {
    notFound()
  }
  
  if (userData.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <AgentRequestsClient 
      adminId={user.id}
      adminName={userData.full_name}
    />
  )
} 