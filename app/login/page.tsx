import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/LoginForm'

export default async function LoginPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (user && !error) {
    redirect('/dashboard?login=true')
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">חדר כושר למכירות</h1>
          <p className="text-gray-600">התחבר כדי להתחיל להתאמן</p>
        </div>
        
        <LoginForm />
        
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
            <a 
              href="/privacy-policy" 
              className="hover:text-gray-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              מדיניות פרטיות
            </a>
            <span className="hidden sm:inline">•</span>
            <a 
              href="/terms-of-service" 
              className="hover:text-gray-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              תנאי שירות
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 