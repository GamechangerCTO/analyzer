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
  UserPlus,
  Eye,
  Zap,
  Key,
  Building2
} from 'lucide-react'
import Avatar from './Avatar'
import Image from 'next/image'
import SimulationNotificationBell from './SimulationNotificationBell'

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
    <div className="flex flex-col h-full bg-white">
      {/* לוגו וכותרת */}
      <div className="p-6 border-b border-neutral-100">
        <Link href="/dashboard" className="flex flex-col items-center gap-0">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Coachee Logo"
              width={160}
              height={160}
              className="object-contain"
            />
          </div>
          <span className="-mt-2 text-sm font-medium text-neutral-600">פלטפורמת אימון</span>
        </Link>
      </div>

      {/* תפריט ניווט */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200
                ${active 
                  ? 'bg-brand-primary text-white' 
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }
              `}
              onClick={() => setIsMobileOpen(false)}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-neutral-500'}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* פעולות מהירות למנהלים */}
      {userData.role === 'manager' && (
        <div className="px-4 py-2">
          <div className="border-t border-neutral-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">פעולות מהירות</span>
            </div>
            
            <div className="space-y-1">
              <Link
                href="/team/add-agent"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                onClick={() => setIsMobileOpen(false)}
              >
                <UserPlus className="w-4 h-4 text-brand-primary" />
                <span>הוסף נציג</span>
              </Link>
              
              <Link
                href="/dashboard/manager/all-calls"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                onClick={() => setIsMobileOpen(false)}
              >
                <Eye className="w-4 h-4 text-brand-secondary" />
                <span>כל השיחות</span>
              </Link>
              
              <Link
                href="/team"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                onClick={() => setIsMobileOpen(false)}
              >
                <Users className="w-4 h-4 text-amber-500" />
                <span>ניהול צוות</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Partner API - Super Admin בלבד */}
      {userData.role === 'super_admin' && (
        <div className="px-4 py-2">
          <div className="border-t border-neutral-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">Partner API</span>
            </div>
            
            <div className="space-y-1">
              <Link
                href="/dashboard/admin/partner-api"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                onClick={() => setIsMobileOpen(false)}
              >
                <Key className="w-4 h-4 text-purple-500" />
                <span>ניהול API Keys</span>
              </Link>
              
              <Link
                href="/dashboard/admin/companies-list"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                onClick={() => setIsMobileOpen(false)}
              >
                <Building2 className="w-4 h-4 text-blue-500" />
                <span>גילוי חברות</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* נוטיפיקציות סימולציה */}
      <div className="px-4 pb-2">
        <SimulationNotificationBell />
      </div>

      {/* פרופיל משתמש */}
      <div className="p-4 border-t border-neutral-100">
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors"
          >
            <Avatar 
              avatarUrl={userProfile.avatar_url} 
              fullName={userProfile.full_name} 
              size="sm" 
            />
            <div className="flex-1 text-right">
              <div className="text-sm font-medium text-neutral-900">
                {userProfile.full_name || user.email}
              </div>
              <div className="text-xs text-neutral-500">
                {userData.role === 'admin' ? 'מנהל מערכת' : 
                 userData.role === 'manager' ? 'מנהל' : 'סוכן'}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
              isUserMenuOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {/* תפריט משתמש */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full right-0 left-0 mb-2 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 z-50">
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  setIsMobileOpen(false)
                }}
              >
                <UserIcon className="w-4 h-4 text-neutral-500" />
                <span>פרופיל</span>
              </Link>
              
              <hr className="my-1 border-neutral-100" />
              
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <LogOut className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'מתנתק...' : 'התנתק'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-neutral-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <Menu className="w-6 h-6 text-neutral-700" />
          </button>
          
          <Link href="/dashboard" className="flex flex-col items-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Coachee Logo"
                width={110}
                height={110}
                className="object-contain"
              />
            </div>
            <span className="-mt-1 text-xs font-medium text-neutral-600">פלטפורמת אימון</span>
          </Link>
          
          {/* Right side placeholder */}
          <div className="w-10 h-10 flex items-center justify-center">
            <div className="w-2 h-2 bg-brand-secondary rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 lg:right-0 lg:z-30">
        <div className="border-l border-neutral-200 h-full bg-white">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          
          {/* Sidebar - מימין ב-RTL */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
                  <Menu className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-base font-semibold text-neutral-900">תפריט ניווט</span>
                </div>
              </div>
              
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>
            
            {/* Content area */}
            <div className="h-[calc(100%-4rem)] overflow-y-auto custom-scrollbar">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
