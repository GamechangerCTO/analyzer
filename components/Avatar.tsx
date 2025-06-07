'use client'

import React from 'react'

// אווטרים גיאומטריים עם צבעי ReplayMe
const DEFAULT_AVATARS = [
  { id: 'geom1', style: 'bg-gradient-to-br from-lemon-mint to-lemon-mint-dark', icon: '👤' },
  { id: 'geom2', style: 'bg-gradient-to-br from-success to-success-light', icon: '🟢' },
  { id: 'geom3', style: 'bg-gradient-to-br from-indigo-night to-indigo-night/80', icon: '🔷' },
  { id: 'geom4', style: 'bg-gradient-to-br from-electric-coral to-electric-coral-light', icon: '💎' },
  { id: 'geom5', style: 'bg-gradient-to-br from-warning to-warning-light', icon: '⭐' },
  { id: 'geom6', style: 'bg-gradient-to-br from-electric-coral-dark to-electric-coral', icon: '🔴' },
  { id: 'geom7', style: 'bg-gradient-to-br from-indigo-night to-accent-light', icon: '🔵' },
  { id: 'geom8', style: 'bg-gradient-to-br from-success to-lemon-mint', icon: '💠' },
  { id: 'geom9', style: 'bg-gradient-to-br from-warning to-electric-coral-light', icon: '🧡' },
  { id: 'geom10', style: 'bg-gradient-to-br from-cream-sand-dark to-ice-gray', icon: '⚫' },
  { id: 'geom11', style: 'bg-gradient-to-br from-lemon-mint-light to-success-light', icon: '🔘' },
  { id: 'geom12', style: 'bg-gradient-to-br from-success-light to-lemon-mint', icon: '💚' },
]

interface AvatarProps {
  avatarUrl?: string | null
  fullName?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl'
}

export default function Avatar({ avatarUrl, fullName, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizeClasses[size]
  
  // אם אין אווטר, נציג אווטר ברירת מחדל עם האות הראשונה של השם
  if (!avatarUrl) {
    const initial = fullName?.charAt(0)?.toUpperCase() || '?'
    return (
      <div className={`${sizeClass} rounded-full bg-cream-sand border-2 border-ice-gray flex items-center justify-center text-indigo-night font-semibold shadow-soft hover:shadow-replayme transition-all duration-200 ${className}`}>
        {initial}
      </div>
    )
  }

  // בדיקה אם זה אווטר גיאומטרי
  const geometricAvatar = DEFAULT_AVATARS.find(a => a.id === avatarUrl)
  if (geometricAvatar) {
    return (
      <div className={`${sizeClass} rounded-full ${geometricAvatar.style} flex items-center justify-center text-white shadow-soft hover:shadow-replayme transition-all duration-200 border-2 border-white/20 ${className}`}>
        <span className="drop-shadow-sm">{geometricAvatar.icon}</span>
      </div>
    )
  }

  // תמונה מותאמת
  return (
    <img 
      src={avatarUrl} 
      alt={fullName || 'אווטר משתמש'} 
      className={`${sizeClass} rounded-full object-cover shadow-soft hover:shadow-replayme transition-all duration-200 border-2 border-white/20 ${className}`}
    />
  )
}

// פונקציה עזר לקבלת URL של אווטר
export const getAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null
  
  // בדיקה אם זה אווטר גיאומטרי
  const geometricAvatar = DEFAULT_AVATARS.find(a => a.id === avatarUrl)
  if (geometricAvatar) {
    return avatarUrl // נחזיר את ה-ID
  }
  
  return avatarUrl // נחזיר את ה-URL של התמונה
} 