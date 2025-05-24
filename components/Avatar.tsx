'use client'

import React from 'react'

// אווטרים גיאומטריים זהים לאלה בפרופיל
const DEFAULT_AVATARS = [
  { id: 'geom1', style: 'bg-gradient-to-br from-blue-400 to-blue-600', icon: '👤' },
  { id: 'geom2', style: 'bg-gradient-to-br from-green-400 to-green-600', icon: '🟢' },
  { id: 'geom3', style: 'bg-gradient-to-br from-purple-400 to-purple-600', icon: '🔷' },
  { id: 'geom4', style: 'bg-gradient-to-br from-pink-400 to-pink-600', icon: '💎' },
  { id: 'geom5', style: 'bg-gradient-to-br from-yellow-400 to-yellow-600', icon: '⭐' },
  { id: 'geom6', style: 'bg-gradient-to-br from-red-400 to-red-600', icon: '🔴' },
  { id: 'geom7', style: 'bg-gradient-to-br from-indigo-400 to-indigo-600', icon: '🔵' },
  { id: 'geom8', style: 'bg-gradient-to-br from-teal-400 to-teal-600', icon: '💠' },
  { id: 'geom9', style: 'bg-gradient-to-br from-orange-400 to-orange-600', icon: '🧡' },
  { id: 'geom10', style: 'bg-gradient-to-br from-gray-400 to-gray-600', icon: '⚫' },
  { id: 'geom11', style: 'bg-gradient-to-br from-cyan-400 to-cyan-600', icon: '🔘' },
  { id: 'geom12', style: 'bg-gradient-to-br from-lime-400 to-lime-600', icon: '💚' },
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
      <div className={`${sizeClass} rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold ${className}`}>
        {initial}
      </div>
    )
  }

  // בדיקה אם זה אווטר גיאומטרי
  const geometricAvatar = DEFAULT_AVATARS.find(a => a.id === avatarUrl)
  if (geometricAvatar) {
    return (
      <div className={`${sizeClass} rounded-full ${geometricAvatar.style} flex items-center justify-center text-white shadow-lg ${className}`}>
        {geometricAvatar.icon}
      </div>
    )
  }

  // תמונה מותאמת
  return (
    <img 
      src={avatarUrl} 
      alt={fullName || 'אווטר משתמש'} 
      className={`${sizeClass} rounded-full object-cover shadow-lg ${className}`}
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