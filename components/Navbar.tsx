'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Avatar from './Avatar'
import Image from 'next/image'

interface UserData {
  id: string
  role: string
  is_approved: boolean | null
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
        setUserProfile({
          full_name: data.full_name || undefined,
          avatar_url: data.avatar_url || undefined
        })
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
    return pathname === path ? 'nav-item-active' : 'nav-item hover:bg-cream-sand'
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
    <nav className="bg-white shadow-soft border-b border-ice-gray">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <Image 
                src="/logo.webp" 
                alt="ReplayMe Logo" 
                width={40} 
                height={40}
                className="w-10 h-10"
              />
              <div className="text-display text-2xl font-bold text-indigo-night">
                ReplayMe
              </div>
            </Link>
          </div>
          
          {/* תפריט מסך רחב */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href="/dashboard" 
              className={`${isActive('/dashboard')}`}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>דשבורד</span>
              </span>
            </Link>
            
            <Link 
              href="/upload" 
              className={`${isActive('/upload')}`}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>העלאת שיחה</span>
              </span>
            </Link>
            
            <Link 
              href="/simulations" 
              className={`${isActive('/simulations')}`}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>חדר כושר 🏋️‍♂️</span>
              </span>
            </Link>
            
            {/* כפתור לדף ניהול מערכת (מנהלי מערכת בלבד) */}
            {userData.role === 'admin' && (
              <Link 
                href="/dashboard/admin" 
                className={`${isActive('/dashboard/admin')}`}
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>ניהול מערכת</span>
                </span>
              </Link>
            )}
            
            {/* תפריט לניהול צוות (למנהלים ובעלי חברות) */}
            {(userData.role === 'owner' || userData.role === 'manager') && (
              <Link 
                href="/team" 
                className={`${isActive('/team')}`}
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>ניהול צוות</span>
                </span>
              </Link>
            )}
            
            {/* פרופיל עם אווטר */}
            <Link 
              href="/profile" 
              className={`${isActive('/profile')} flex items-center space-x-2`}
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
              className="replayme-button-coral text-sm disabled:opacity-50"
            >
              {isLoading ? 'מתנתק...' : 'התנתק'}
            </button>
          </div>
          
          {/* כפתור המבורגר למובייל */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-indigo-night hover:text-indigo-night/80 hover:bg-cream-sand focus:outline-none focus:ring-2 focus:ring-lemon-mint"
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
        <div className="md:hidden bg-cream-sand border-t border-ice-gray">
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
            
            {userData.role === 'admin' && (
              <Link
                href="/dashboard/admin"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/dashboard/admin')}`}
                onClick={() => setIsMenuOpen(false)}
              >
                ניהול מערכת
              </Link>
            )}
            
            {(userData.role === 'owner' || userData.role === 'manager') && (
              <Link
                href="/team"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/team')}`}
                onClick={() => setIsMenuOpen(false)}
              >
                ניהול צוות
              </Link>
            )}
            
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
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full text-right replayme-button-coral text-base disabled:opacity-50 mr-3"
            >
              {isLoading ? 'מתנתק...' : 'התנתק'}
            </button>
          </div>
        </div>
      )}
    </nav>
  )
} 