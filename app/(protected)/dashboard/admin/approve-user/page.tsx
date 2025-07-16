'use client'

import { useState } from 'react'
import { approveSpecificUser, approveUserById } from '@/lib/actions/users'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, User, Info } from 'lucide-react'

export default function ApproveUserPage() {
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const router = useRouter()

  // אישור המשתמש הספציפי שהועלה בדוגמה
  const handleApproveSpecificUser = async () => {
    setLoading(true)
    try {
      const result = await approveSpecificUser()
      setResult(result)
      if (result.success) {
        setTimeout(() => {
          router.push('/dashboard/admin/users?show=not_approved')
        }, 1500)
      }
    } catch (error) {
      console.error('שגיאה:', error)
      setResult({ success: false, error: 'שגיאה לא צפויה' })
    } finally {
      setLoading(false)
    }
  }

  // אישור משתמש לפי ID
  const handleApproveById = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim()) {
      setResult({ success: false, error: 'נא להזין מזהה משתמש' })
      return
    }
    
    setLoading(true)
    try {
      const result = await approveUserById(userId)
      setResult({ ...result, message: 'המשתמש אושר בהצלחה' })
      setUserId('')
      if (result.success) {
        setTimeout(() => {
          router.push('/dashboard/admin/users?show=not_approved')
        }, 1500)
      }
    } catch (error) {
      console.error('שגיאה:', error)
      setResult({ success: false, error: 'שגיאה לא צפויה' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">אישור משתמשים</h1>
        <Link href="/dashboard/admin/users" className="text-blue-500 hover:underline">
          &larr; חזרה לרשימת המשתמשים
        </Link>
      </div>
      
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-glacier-neutral-200/50 p-8">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-glacier-primary rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">אישור משתמש לפי מזהה</h2>
              <p className="text-glacier-neutral-600">הזן מזהה משתמש לאישור מיידי במערכת</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleApproveById} className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="userId" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-glacier-primary" />
              מזהה משתמש
              <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              id="userId" 
              value={userId} 
              onChange={(e) => setUserId(e.target.value)}
              className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
              placeholder="הזן מזהה משתמש (UUID)"
              required
            />
            <p className="text-glacier-neutral-600 text-sm">
              המזהה הוא מחרוזת ייחודית בפורמט UUID שניתן למצוא ברשימת המשתמשים
            </p>
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !userId.trim()}
            className="w-full px-6 py-4 bg-gradient-to-r from-glacier-primary to-glacier-primary-dark text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transform-gpu shadow-lg hover:shadow-xl disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>מאשר משתמש...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>אשר משתמש</span>
              </>
            )}
          </button>
        </form>
        
        {/* Info Box */}
        <div className="mt-8 p-6 bg-gradient-to-r from-glacier-accent-50 to-glacier-secondary-50 border border-glacier-accent-200 rounded-2xl">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-glacier-accent rounded-xl flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-neutral-900 mb-2">איך למצוא מזהה משתמש?</h3>
              <div className="space-y-2 text-sm text-neutral-700">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-glacier-accent rounded-full mt-2 flex-shrink-0"></div>
                  <span>עבור לעמוד "ניהול משתמשים"</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-glacier-accent rounded-full mt-2 flex-shrink-0"></div>
                  <span>מצא את המשתמש ברשימה</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-glacier-accent rounded-full mt-2 flex-shrink-0"></div>
                  <span>העתק את המזהה מעמודת "מזהה"</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">אישור המשתמש הספציפי</h2>
        <p className="mb-4 text-gray-700">
          <strong>אימייל:</strong> triroars@gmail.com<br />
          <strong>מזהה:</strong> 2759aed1-b865-402f-9bb8-faf89a879e93
        </p>
        <button 
          onClick={handleApproveSpecificUser} 
          disabled={loading}
          className="bg-primary text-white py-2 px-4 rounded disabled:bg-gray-400"
        >
          {loading ? 'מאשר...' : 'אשר משתמש זה'}
        </button>
      </div>
      
      {result && (
        <div className={`p-4 rounded-md ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {result.success 
            ? (
                <div>
                  <p>{result.message || 'הפעולה הושלמה בהצלחה'}</p>
                  <p className="mt-2">
                    המשתמש המאושר יופיע ברשימת המשתמשים. 
                    <Link href="/dashboard/admin/users?show=not_approved" className="text-blue-600 hover:underline pr-1">
                      לחץ כאן
                    </Link>
                    כדי לראות משתמשים נוספים הממתינים לאישור.
                  </p>
                </div>
              )
            : <p>שגיאה: {result.error}</p>
          }
        </div>
      )}
    </div>
  )
} 