import React from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import CompanyQuotaManagement from '@/components/admin/CompanyQuotaManagement'

export default async function CompanyQuotasPage() {
  const cookieStore = cookies()
  const supabase = createClient()
  
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ניהול מכסות משתמשים</h1>
          <p className="mt-2 text-gray-600">
            נהל את מכסות המשתמשים עבור כל החברות במערכת
          </p>
        </div>
        
        <CompanyQuotaManagement adminId={user.id} />
      </div>
    </div>
  )
} 