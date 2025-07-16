'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Shield, Camera, Check, X, Upload, AlertCircle, CheckCircle2, Edit3, Save } from 'lucide-react'

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
    <div className="space-y-8">
      {/* הודעות */}
      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-gradient-to-r from-glacier-success-50 to-green-100 border border-glacier-success-200 rounded-2xl animate-in slide-in-from-top duration-500">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-glacier-success rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <p className="text-glacier-success-700 font-bold">{success}</p>
          </div>
        </div>
      )}

      {/* תצוגת פרופיל */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-glacier-neutral-200/50 overflow-hidden">
        
        {/* Header עם כפתור עריכה */}
        <div className="bg-gradient-to-r from-glacier-primary to-glacier-primary-dark p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">פרופיל משתמש</h2>
                <p className="text-glacier-primary-100">נהל את פרטיך האישיים</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all duration-300 flex items-center gap-2 hover:scale-[1.02] transform-gpu"
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  <span>ביטול</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>עריכה</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8 space-y-8 lg:space-y-0">
            
            {/* אווטר */}
            <div className="flex flex-col items-center space-y-6 lg:w-80">
              <div className="relative">
                {renderAvatar(selectedAvatar, 'w-32 h-32 border-4 border-glacier-primary/20 shadow-xl')}
                
                {isEditing && (
                  <div className="absolute -bottom-2 -right-2">
                    <button
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="w-10 h-10 bg-glacier-primary hover:bg-glacier-primary-dark text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              
              {isEditing && (
                <div className="space-y-4 w-full">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="px-4 py-3 bg-glacier-primary hover:bg-glacier-primary-dark text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] transform-gpu"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm">בחר אווטר</span>
                    </button>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-3 bg-glacier-accent hover:bg-glacier-accent-dark text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] transform-gpu"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">העלה תמונה</span>
                    </button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* בוחר אווטרים */}
              {showAvatarPicker && isEditing && (
                <div className="relative z-10 bg-white border-2 border-glacier-neutral-200 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-neutral-900">בחר אווטר</h3>
                    <button
                      onClick={() => setShowAvatarPicker(false)}
                      className="p-1 hover:bg-glacier-neutral-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-neutral-600" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {DEFAULT_AVATARS.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => handleAvatarSelect(avatar.id)}
                        className={`w-12 h-12 rounded-xl ${avatar.style} flex items-center justify-center text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl ${
                          selectedAvatar === avatar.id ? 'ring-4 ring-glacier-primary scale-110' : ''
                        }`}
                      >
                        {avatar.icon}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* פרטי המשתמש */}
            <div className="flex-1 space-y-8">
              
              {/* שם מלא */}
              <div className="space-y-3">
                <label className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-glacier-primary" />
                  שם מלא
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                    placeholder="הכנס שם מלא"
                  />
                ) : (
                  <div className="p-4 bg-glacier-neutral-50 rounded-xl border border-glacier-neutral-200">
                    <p className="text-neutral-900 font-medium">{userData.full_name || 'לא הוזן שם'}</p>
                  </div>
                )}
              </div>

              {/* אימייל */}
              <div className="space-y-3">
                <label className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-glacier-accent" />
                  כתובת אימייל
                </label>
                <div className="p-4 bg-glacier-neutral-50 rounded-xl border border-glacier-neutral-200">
                  <p className="text-neutral-800 font-medium">{userData.email}</p>
                  <p className="text-xs text-glacier-neutral-500 mt-1">לא ניתן לשנות את כתובת האימייל</p>
                </div>
              </div>

              {/* תפקיד */}
              <div className="space-y-3">
                <label className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-glacier-warning" />
                  תפקיד במערכת
                </label>
                <div className="p-4 bg-glacier-neutral-50 rounded-xl border border-glacier-neutral-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      userData.role === 'admin' ? 'bg-red-500' :
                      userData.role === 'manager' ? 'bg-glacier-warning' : 'bg-glacier-primary'
                    }`}></div>
                    <span className="text-neutral-900 font-medium">
                      {userData.role === 'admin' ? 'מנהל מערכת' :
                       userData.role === 'manager' ? 'מנהל' : 'נציג'}
                    </span>
                  </div>
                </div>
              </div>

              {/* חברה */}
              {userData.companies && (
                <div className="space-y-3">
                  <label className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-glacier-secondary" />
                    חברה
                  </label>
                  <div className="p-4 bg-glacier-neutral-50 rounded-xl border border-glacier-neutral-200">
                    <p className="text-neutral-900 font-medium">{userData.companies.name}</p>
                  </div>
                </div>
              )}

              {/* כפתורי פעולה */}
              {isEditing && (
                <div className="flex gap-4 pt-6 border-t border-glacier-neutral-200">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-glacier-success to-glacier-success-dark text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transform-gpu shadow-lg hover:shadow-xl disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>שומר...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>שמור שינויים</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setFullName(userData.full_name || '')
                      setSelectedAvatar(userData.avatar_url || '')
                      setError(null)
                    }}
                    className="flex-1 px-6 py-4 bg-glacier-neutral-200 hover:bg-glacier-neutral-300 text-glacier-neutral-700 font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] transform-gpu flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    <span>ביטול</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* סטטיסטיקות מהירות */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-glacier-neutral-200/50 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-glacier-primary rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">סטטוס חשבון</h3>
              <p className="text-glacier-neutral-600">פעיל ומאומת</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-glacier-neutral-200/50 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-glacier-accent rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">רמת גישה</h3>
              <p className="text-glacier-neutral-600">
                {userData.role === 'admin' ? 'מנהל מערכת' :
                 userData.role === 'manager' ? 'מנהל צוות' : 'נציג מכירות'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-glacier-neutral-200/50 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-glacier-secondary rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">מצב אישור</h3>
              <p className="text-glacier-neutral-600">מאושר ופעיל</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 