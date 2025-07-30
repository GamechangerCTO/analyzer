'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Upload, 
  Dumbbell, 
  Settings, 
  Users, 
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building
} from 'lucide-react'
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

interface SidebarProps {
  user: User
  userData: UserData
}

export default function Sidebar({ user, userData }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile>({})
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  
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
    return pathname === path || pathname.startsWith(path + '/')
  }

  // תפריט ניווט לפי תפקיד
  const getNavigationItems = () => {
    const baseItems = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'דשבורד' },
      { href: '/upload', icon: Upload, label: 'העלאת שיחה' },
      { href: '/simulations', icon: Dumbbell, label: 'חדר כושר' },
    ]

    if (userData.role === 'admin') {
      baseItems.push({ href: '/dashboard/admin', icon: Settings, label: 'ניהול מערכת' })
    }
    
    if (userData.role === 'manager') {
      baseItems.push({ href: '/team', icon: Users, label: 'ניהול צוות' })
    }

    return baseItems
  }

  const navigationItems = getNavigationItems()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* לוגו וכותרת עם אנימציות מתקדמות */}
      <div className="p-6 border-b border-neutral-200">
        <Link href="/dashboard" className="group flex items-center gap-3 coachee-interactive relative overflow-hidden">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-glacier-primary/10 to-glacier-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
          
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-glacier-primary to-glacier-accent flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 transform-gpu">
            {/* Floating particles */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-glacier-accent rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
            <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-glacier-primary rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-opacity duration-300 delay-150"></div>
            
            <Image
              src="/logo.png"
              alt="Coachee Logo"
              width={48}
              height={48}
              className="transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <div className="flex flex-col relative z-10">
            <div className="text-xl font-bold text-neutral-900 group-hover:text-glacier-primary transition-colors duration-300">
              Coachee
              <div className="absolute inset-0 bg-gradient-to-r from-glacier-primary to-glacier-accent bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Coachee
              </div>
            </div>
            <div className="text-sm text-neutral-600 group-hover:text-glacier-accent transition-colors duration-300">פלטפורמת אימון</div>
          </div>
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
        </Link>
      </div>

      {/* תפריט ניווט עם אנימציות מתקדמות */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item, index) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-500 ease-out transform-gpu
                ${active 
                  ? 'text-white shadow-2xl scale-[1.02] bg-gradient-to-r from-glacier-primary to-glacier-accent' 
                  : 'text-neutral-700 hover:bg-gradient-to-r hover:from-glacier-primary-light/20 hover:to-glacier-accent-light/20 hover:text-neutral-900 hover:scale-[1.02] hover:shadow-lg'
                }
              `}
              onClick={() => setIsMobileOpen(false)}
              style={{animationDelay: `${index * 100}ms`}}
            >
              {/* Active background animation */}
              {active && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-glacier-primary to-glacier-accent animate-pulse opacity-50"></div>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 animate-pulse"></div>
                </>
              )}
              
              {/* Hover shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
              
              <div className={`relative z-10 transition-all duration-300 ${
                active ? 'scale-110 text-white' : 'group-hover:scale-110'
              }`}>
                <Icon className={`w-5 h-5 transition-all duration-300 ${
                  active 
                    ? 'text-white animate-bounce' 
                    : 'text-neutral-500 group-hover:text-glacier-primary group-hover:rotate-6'
                }`} />
              </div>
              
              <span className={`font-medium relative z-10 transition-all duration-300 ${
                active ? 'text-white' : 'group-hover:font-bold'
              }`}>{item.label}</span>
              
              {active && (
                <div className="mr-auto w-2 h-2 bg-white/60 rounded-full animate-ping relative z-10" />
              )}
              
              {/* Floating indicator for active item */}
              {active && (
                <>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-glacier-accent/50 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-glacier-primary/50 rounded-full animate-bounce"></div>
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* פרופיל משתמש עם אנימציות מתקדמות */}
      <div className="p-4 border-t border-neutral-200">
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="group w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gradient-to-r hover:from-glacier-primary-light/20 hover:to-glacier-accent-light/20 transition-all duration-500 ease-out coachee-interactive relative overflow-hidden hover:shadow-lg hover:scale-[1.02] transform-gpu"
          >
            {/* Background shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-glacier-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
            
            <div className="relative z-10 transition-all duration-300 group-hover:scale-110">
              <Avatar 
                avatarUrl={userProfile.avatar_url} 
                fullName={userProfile.full_name} 
                size="sm" 
              />
            </div>
            <div className="flex-1 text-right relative z-10">
              <div className="text-sm font-medium text-neutral-900 group-hover:text-glacier-primary transition-colors duration-300">
                {userProfile.full_name || user.email}
              </div>
              <div className="text-xs text-neutral-600 group-hover:text-glacier-accent transition-colors duration-300">
                {userData.role === 'admin' ? 'מנהל מערכת' : 
                 userData.role === 'manager' ? 'מנהל' : 'סוכן'}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-all duration-300 relative z-10 group-hover:text-glacier-primary group-hover:scale-110 ${
              isUserMenuOpen ? 'rotate-180' : ''
            }`} />
            
            {/* Floating indicators */}
            {isUserMenuOpen && (
              <>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-glacier-primary rounded-full animate-pulse"></div>
                <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-glacier-accent rounded-full animate-bounce"></div>
              </>
            )}
          </button>

          {/* תפריט משתמש עם אנימציות מתקדמות */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full right-0 left-0 mb-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200 py-2 z-50 animate-in slide-in-from-bottom-2 duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-glacier-primary-light/5 to-glacier-accent-light/5 rounded-2xl"></div>
              
              <Link
                href="/profile"
                className="group relative flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-gradient-to-r hover:from-glacier-primary-50 hover:to-glacier-accent-50 transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  setIsMobileOpen(false)
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-glacier-primary to-glacier-accent opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                <UserIcon className="w-4 h-4 relative z-10 group-hover:text-glacier-primary group-hover:scale-110 transition-all duration-200" />
                <span className="relative z-10 group-hover:font-medium transition-all duration-200">פרופיל</span>
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-glacier-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center"></div>
              </Link>
              
              <hr className="my-2 border-neutral-200" />
              
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="group relative w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 transition-all duration-300 disabled:opacity-50 hover:scale-[1.02] transform-gpu overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                <LogOut className={`w-4 h-4 relative z-10 group-hover:scale-110 transition-all duration-200 ${
                  isLoading ? 'animate-spin' : 'group-hover:text-red-700'
                }`} />
                <span className="relative z-10 group-hover:font-medium transition-all duration-200">
                  {isLoading ? 'מתנתק...' : 'התנתק'}
                </span>
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center"></div>
                
                {/* Loading dots */}
                {isLoading && (
                  <div className="mr-auto flex space-x-1">
                    <div className="w-1 h-1 bg-red-600 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-red-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-1 h-1 bg-red-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Header - 2025 Modern Design */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-neutral-200 shadow-lg">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="group p-3 rounded-2xl hover:bg-gradient-to-r hover:from-glacier-primary/10 hover:to-glacier-accent/10 transition-all duration-300 coachee-interactive hover:scale-110 transform-gpu relative overflow-hidden"
          >
            {/* Button shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-glacier-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
            
            <Menu className="w-6 h-6 text-neutral-700 group-hover:text-glacier-primary transition-colors duration-300 relative z-10 group-hover:rotate-180" />
            
            {/* Floating indicator */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-glacier-accent rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
          </button>
          
          <Link href="/dashboard" className="group flex items-center gap-3 px-4 py-2 rounded-2xl hover:bg-gradient-to-r hover:from-glacier-primary/10 hover:to-glacier-accent/10 transition-all duration-300 relative overflow-hidden">
            {/* Background shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-glacier-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-glacier-primary to-glacier-accent flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 transform-gpu shadow-lg">
              {/* Logo particles */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-glacier-accent rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
              <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-glacier-primary rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-opacity duration-300"></div>
              
              <Image
                src="/logo.png"
                alt="Coachee Logo"
                width={20}
                height={20}
                className="transition-transform duration-300 group-hover:scale-110 relative z-10"
              />
            </div>
            <div className="flex flex-col relative z-10">
              <span className="text-lg font-bold text-neutral-900 group-hover:text-glacier-primary transition-colors duration-300">Coachee</span>
              <span className="text-xs text-neutral-600 group-hover:text-glacier-accent transition-colors duration-300">פלטפורמת אימון</span>
            </div>
          </Link>
          
          {/* Right side placeholder with notification indicator */}
          <div className="w-12 h-12 flex items-center justify-center">
            <div className="relative">
              <div className="w-3 h-3 bg-gradient-to-r from-glacier-success to-glacier-accent rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 bg-gradient-to-r from-glacier-success to-glacier-accent rounded-full animate-ping opacity-75"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - תיקון ל-RTL positioning */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 lg:right-0 lg:z-30">
        <div className="coachee-glass-sidebar border-l border-glacier-neutral-200/50 h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar Overlay - 2025 Enhanced */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 animate-in fade-in duration-300">
          {/* Enhanced Backdrop with blur */}
          <div 
            className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setIsMobileOpen(false)}
          />
          
          {/* Sidebar - מימין ב-RTL עם אנימציות מתקדמות */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-xl shadow-2xl transform transition-all duration-500 ease-out animate-in slide-in-from-right">
            {/* Header עם עיצוב מתקדם */}
            <div className="relative flex items-center justify-between p-6 border-b border-neutral-200 bg-gradient-to-r from-glacier-primary/5 to-glacier-accent/5">
              {/* Background pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-glacier-primary/10 to-glacier-accent/10 opacity-50"></div>
              
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-glacier-primary to-glacier-accent flex items-center justify-center shadow-lg">
                  <Menu className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold text-neutral-900">תפריט ניווט</span>
                  <div className="text-xs text-neutral-600">Coachee Platform</div>
                </div>
              </div>
              
              <button
                onClick={() => setIsMobileOpen(false)}
                className="group relative p-3 rounded-2xl hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 transition-all duration-300 hover:scale-110 transform-gpu overflow-hidden"
              >
                {/* Button background */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                
                <X className="w-5 h-5 text-neutral-700 group-hover:text-red-600 transition-all duration-300 relative z-10 group-hover:rotate-90" />
                
                {/* Close button indicator */}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
              </button>
            </div>
            
            {/* Content area עם scroll מותאם */}
            <div className="h-[calc(100%-5rem)] overflow-y-auto custom-scrollbar bg-gradient-to-b from-white to-glacier-primary/5">
              <SidebarContent />
            </div>
            
            {/* Footer with gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-glacier-accent/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
      )}
    </>
  )
} 