import React from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

interface EditAgentPageProps {
  params: {
    id: string
  }
}

export default async function EditAgentPage({ params }: EditAgentPageProps) {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user || error) {
    redirect('/login')
  }
  
  // בדיקה שהמשתמש הוא מנהל
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, company_id')
    .eq('id', user.id)
    .single()
  
  if (userError || !userData) {
    notFound()
  }
  
  if (userData.role !== 'manager') {
    redirect('/dashboard')
  }

  // וידוא שיש company_id
  if (!userData.company_id) {
    notFound()
  }

  // קבלת פרטי הנציג
  const { data: agentData, error: agentError } = await supabase
    .from('users')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', userData.company_id) // וידוא שהנציג שייך לאותה חברה
    .single()

  if (agentError || !agentData) {
    notFound()
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">עריכת נציג</h1>
        <Link
          href="/team"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
        >
          חזרה לניהול צוות →
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">פרטי הנציג</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{agentData.full_name || 'לא מוגדר'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{agentData.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תפקיד</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">
                {agentData.role === 'manager' ? 'מנהל' : 
                 agentData.role === 'agent' ? 'נציג' : 
                 agentData.role}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
              <p className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                agentData.is_approved 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {agentData.is_approved ? 'מאושר' : 'ממתין לאישור'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">הצטרף בתאריך</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">
                {new Date(agentData.created_at).toLocaleDateString('he-IL')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 עריכת פרטי נציגים תהיה זמינה בגרסה עתידית של המערכת.
          </p>
        </div>
      </div>
    </div>
  )
} 