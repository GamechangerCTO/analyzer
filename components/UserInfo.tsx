'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserInfoProps {
  user: User
}

export default function UserInfo({ user }: UserInfoProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">שלום, {user.email}</h2>
          <p className="text-gray-600">מזהה משתמש: {user.id.substring(0, 8)}...</p>
        </div>
        
        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {isLoading ? 'מתנתק...' : 'התנתק'}
        </button>
      </div>
    </div>
  )
} 