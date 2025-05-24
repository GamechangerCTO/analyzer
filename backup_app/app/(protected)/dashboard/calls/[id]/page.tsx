'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CallAnalysis from '@/components/CallAnalysis'
import { CallData } from '@/types/calldata.types'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface CallPageProps {
  params: {
    id: string
  }
}

export default function CallPage({ params }: CallPageProps) {
  const supabase = createClient()
  const [call, setCall] = useState<CallData | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        console.error('שגיאת אימות:', authError)
        return
      }
      
      setUser(authUser)
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      if (userError) {
        console.error('שגיאה בטעינת נתוני משתמש:', userError)
        return
      }
      
      setUserData(userData)
    }
    
    fetchUserData()
  }, [supabase])

  useEffect(() => {
    const fetchCallData = async () => {
      if (!params.id) {
        setError('מזהה שיחה לא סופק')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // 1. קבל את נתוני השיחה מטבלת 'calls'
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .select(`
            *,
            users:user_id (id, full_name, email),
            companies:company_id (id, name)
          `)
          .eq('id', params.id)
          .single()

        if (callError) {
          console.error('Error fetching call:', callError)
          throw new Error('שגיאה בטעינת נתוני השיחה: ' + callError.message)
        }

        if (!callData) {
          throw new Error('השיחה לא נמצאה.')
        }
        
        setCall(callData as CallData)

        // 2. קבל את ה-URL החתום לקובץ האודיו
        if (callData.audio_file_path) {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('audio_files')
            .createSignedUrl(callData.audio_file_path, 60 * 60) // URL תקף לשעה

          if (urlError) {
            console.error('Error creating signed URL:', urlError)
            // אפשר להמשיך להציג את הניתוח גם אם אין אודיו זמין
            setAudioUrl(null)
          } else {
            setAudioUrl(urlData.signedUrl)
          }
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'שגיאה לא ידועה בטעינת השיחה')
      } finally {
        setLoading(false)
      }
    }

    fetchCallData()
  }, [params.id, supabase])

  if (!user || !userData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mr-4 text-lg">טוען נתוני משתמש...</p>
      </div>
    )
  }

  return (
    <>
      {user && userData && <Navbar user={user} userData={userData} />}
      
      <div className="container mx-auto p-4 md:p-8">
        {/* שורת ניווט והכותרת */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
              דשבורד
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-600">פרטי שיחה</span>
          </div>
          
          <h1 className="text-2xl font-bold">פרטי שיחה וניתוח</h1>
        </div>
      
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mr-4 text-lg">טוען נתוני שיחה...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col justify-center items-center h-64 text-center p-4">
            <h2 className="text-xl font-semibold text-red-600 mb-2">אירעה שגיאה</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              חזור לדשבורד
            </button>
          </div>
        )}

        {!loading && !error && call && (
          <CallAnalysis call={call} audioUrl={audioUrl} />
        )}
      </div>
    </>
  )
} 