'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// אווטרים גיאומטריים יפים
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

interface UserData {
  id: string
  full_name?: string
  email: string
  role: string
  avatar_url?: string
  company_id?: string
  created_at: string
  companies?: {
    name: string
    sector?: string
  }
}

interface ProfileFormProps {
  userData: UserData
  onDataUpdate: (newData: Partial<UserData>) => void
}

export default function ProfileForm({ userData, onDataUpdate }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  
  // שדות הטופס
  const [fullName, setFullName] = useState(userData.full_name || '')
  const [selectedAvatar, setSelectedAvatar] = useState(userData.avatar_url || '')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // validation
  const validateForm = () => {
    if (!fullName.trim()) {
      setError('שם מלא הוא שדה חובה')
      return false
    }
    if (fullName.trim().length < 2) {
      setError('שם מלא חייב להכיל לפחות 2 תווים')
      return false
    }
    return true
  }

  // שמירת שינויים
  const handleSave = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          avatar_url: selectedAvatar
        })
        .eq('id', userData.id)

      if (updateError) {
        throw updateError
      }

      // עדכון הנתונים המקומיים
      onDataUpdate({
        full_name: fullName.trim(),
        avatar_url: selectedAvatar
      })

      setSuccess('הפרופיל עודכן בהצלחה!')
      setIsEditing(false)
      
      // הסתרת הודעת הצלחה אחרי 3 שניות
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('שגיאה בעדכון הפרופיל. אנא נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  // העלאת תמונה מותאמת
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // validation
    if (!file.type.startsWith('image/')) {
      setError('יש להעלות קובץ תמונה בלבד')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('גודל הקובץ חייב להיות קטן מ-5MB')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // יצירת שם קובץ ייחודי
      const fileExt = file.name.split('.').pop()
      const fileName = `${userData.id}_${Date.now()}.${fileExt}`
      
      // העלאה ל-Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // קבלת URL של התמונה
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setSelectedAvatar(data.publicUrl)
    } catch (err) {
      console.error('Error uploading file:', err)
      setError('שגיאה בהעלאת התמונה. אנא נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  // בחירת אווטר
  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId)
    setShowAvatarPicker(false)
  }

  // ביטול עריכה
  const handleCancel = () => {
    setFullName(userData.full_name || '')
    setSelectedAvatar(userData.avatar_url || '')
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  // רנדור אווטר
  const renderAvatar = (avatarUrl: string, size = 'w-24 h-24') => {
    if (!avatarUrl) {
      return (
        <div className={`${size} rounded-full bg-gray-300 flex items-center justify-center text-gray-600`}>
          <span className="text-2xl">👤</span>
        </div>
      )
    }

    // בדיקה אם זה אווטר גיאומטרי
    const geometricAvatar = DEFAULT_AVATARS.find(a => a.id === avatarUrl)
    if (geometricAvatar) {
      return (
        <div className={`${size} rounded-full ${geometricAvatar.style} flex items-center justify-center text-white text-2xl shadow-lg`}>
          {geometricAvatar.icon}
        </div>
      )
    }

    // תמונה מותאמת
    return (
      <img 
        src={avatarUrl} 
        alt="אווטר" 
        className={`${size} rounded-full object-cover shadow-lg`}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* הודעות */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700 text-right">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-700 text-right">{success}</p>
        </div>
      )}

      {/* תצוגת פרופיל */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8 space-y-6 lg:space-y-0">
        
        {/* אווטר */}
        <div className="flex flex-col items-center space-y-4">
          {renderAvatar(selectedAvatar, 'w-32 h-32')}
          
          {isEditing && (
            <div className="space-y-2">
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                בחר אווטר
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              >
                העלה תמונה
              </button>
            </div>
          )}

          {/* בוחר אווטרים */}
          {showAvatarPicker && isEditing && (
            <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-4 grid grid-cols-4 gap-2">
              {DEFAULT_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarSelect(avatar.id)}
                  className={`w-12 h-12 rounded-full ${avatar.style} flex items-center justify-center text-white hover:scale-110 transition-transform`}
                >
                  {avatar.icon}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* פרטי המשתמש */}
        <div className="flex-1 space-y-6">
          
          {/* שם מלא */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 text-right">שם מלא</label>
            {isEditing ? (
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                placeholder="הכנס שם מלא"
              />
            ) : (
              <p className="text-gray-900 text-right">{userData.full_name || 'לא הוזן שם'}</p>
            )}
          </div>

          {/* אימייל */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 text-right">כתובת אימייל</label>
            <p className="text-gray-600 text-right">{userData.email}</p>
            <p className="text-xs text-gray-500 text-right">לא ניתן לשנות את כתובת האימייל</p>
          </div>

          {/* תפקיד */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 text-right">תפקיד</label>
            <p className="text-gray-600 text-right">
              {userData.role === 'agent' ? 'נציג' : 
               userData.role === 'manager' ? 'מנהל' :
               userData.role === 'admin' ? 'מנהל מערכת' : userData.role}
            </p>
          </div>

          {/* חברה */}
          {userData.companies && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 text-right">חברה</label>
              <p className="text-gray-600 text-right">{userData.companies.name}</p>
              {userData.companies.sector && (
                <p className="text-sm text-gray-500 text-right">תחום: {userData.companies.sector}</p>
              )}
            </div>
          )}

          {/* תאריך הצטרפות */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 text-right">תאריך הצטרפות</label>
            <p className="text-gray-600 text-right">
              {new Date(userData.created_at).toLocaleDateString('he-IL')}
            </p>
          </div>

          {/* כפתורי פעולה */}
          <div className="flex justify-end space-x-3 pt-6">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'שומר...' : 'שמור שינויים'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                ערוך פרופיל
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 