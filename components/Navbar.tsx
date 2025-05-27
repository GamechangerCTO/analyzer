'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Avatar from './Avatar'

interface UserData {
  id: string
  role: string
  is_approved: boolean
  company_id: string | null
}

interface UserProfile {
  full_name?: string
  avatar_url?: string
}

interface NavbarProps {
  user: User
  userData: UserData
}

export default function Navbar({ user, userData }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile>({})
  
  // שליפת פרופיל המשתמש
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      
      if (data && !error) {
        setUserProfile(data)
      }
    }
    
    fetchUserProfile()
  }, [user.id, supabase])
  
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
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
  }
  
  // בדיקה האם המשתמש הוא מנהל מערכת
  const isSystemAdmin = async () => {
    const { data, error } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    
    return !!data
  }
  
  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="text-xl font-bold text-primary">
              חדר כושר למכירות
            </div>
          </div>
          
          {/* תפריט מסך רחב */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/dashboard')}`}
            >
              דשבורד
            </Link>
            <Link 
              href="/upload" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/upload')}`}
            >
              העלאת שיחה
            </Link>
            <Link 
              href="/simulations" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/simulations')}`}
            >
              חדר כושר 🏋️‍♂️
            </Link>
            
            {/* כפתור לדף ניהול מערכת (מנהלי מערכת בלבד) */}
            {userData.role === 'admin' && (
              <Link 
                href="/dashboard/admin" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/dashboard/admin')}`}
              >
                ניהול מערכת
              </Link>
            )}
            
            {/* תפריט לניהול צוות (למנהלים ובעלי חברות) */}
            {(userData.role === 'owner' || userData.role === 'manager') && (
              <Link 
                href="/team" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/team')}`}
              >
                ניהול צוות
              </Link>
            )}
            
            {/* פרופיל עם אווטר */}
            <Link 
              href="/profile" 
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${isActive('/profile')}`}
            >
              <Avatar 
                avatarUrl={userProfile.avatar_url} 
                fullName={userProfile.full_name} 
                size="sm" 
              />
              <span>פרופיל</span>
            </Link>
            
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="px-3 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 mr-4"
            >
              {isLoading ? 'מתנתק...' : 'התנתק'}
            </button>
          </div>
          
          {/* כפתור המבורגר למובייל */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">פתח תפריט</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* תפריט מובייל */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/dashboard')}`}
              onClick={() => setIsMenuOpen(false)}
            >
              דשבורד
            </Link>
            <Link
              href="/upload"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/upload')}`}
              onClick={() => setIsMenuOpen(false)}
            >
              העלאת שיחה
            </Link>
            <Link
              href="/simulations"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/simulations')}`}
              onClick={() => setIsMenuOpen(false)}
            >
              חדר כושר 🏋️‍♂️
            </Link>
            
            {/* כפתור לדף ניהול מערכת (מנהלי מערכת בלבד) */}
            {userData.role === 'admin' && (
              <Link
                href="/dashboard/admin"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/dashboard/admin')}`}
                onClick={() => setIsMenuOpen(false)}
              >
                ניהול מערכת
              </Link>
            )}
            
            {/* תפריט לניהול צוות (למנהלים ובעלי חברות) */}
            {(userData.role === 'owner' || userData.role === 'manager') && (
              <Link
                href="/team"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/team')}`}
                onClick={() => setIsMenuOpen(false)}
              >
                ניהול צוות
              </Link>
            )}
            
            {/* פרופיל עם אווטר - מובייל */}
            <Link
              href="/profile"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${isActive('/profile')}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Avatar 
                avatarUrl={userProfile.avatar_url} 
                fullName={userProfile.full_name} 
                size="sm" 
              />
              <span>פרופיל</span>
            </Link>
            
            <button
              onClick={() => {
                handleSignOut()
                setIsMenuOpen(false)
              }}
              disabled={isLoading}
              className="w-full text-right px-3 py-2 rounded-md text-base font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 mt-4"
            >
              {isLoading ? 'מתנתק...' : 'התנתק'}
            </button>
          </div>
        </div>
      )}
    </nav>
  )
} 