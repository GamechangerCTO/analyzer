import React from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import TeamManagementClient from '@/components/TeamManagementClient'

export default async function TeamPage() {
  const cookieStore = cookies()
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user || error) {
    redirect('/login')
  }
  
  // בדיקה שהמשתמש הוא מנהל או בעל חברה
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, company_id, full_name')
    .eq('id', user.id)
    .single()
  
  if (userError || !userData) {
    notFound()
  }
  
  if (userData.role !== 'manager') {
    redirect('/dashboard')
  }
  
  // בדיקה שיש company_id
  if (!userData.company_id) {
    notFound()
  }
  
  return (
    <TeamManagementClient 
      userId={user.id}
      companyId={userData.company_id}
      userRole={userData.role}
      userFullName={userData.full_name}
    />
  )
} 