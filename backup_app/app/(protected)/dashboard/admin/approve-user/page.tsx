'use client'

import { useState } from 'react'
import { approveSpecificUser, approveUserById } from '@/lib/actions/users'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">אישור משתמש לפי מזהה</h2>
        <form onSubmit={handleApproveById} className="space-y-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">מזהה משתמש</label>
            <input 
              type="text" 
              id="userId" 
              value={userId} 
              onChange={(e) => setUserId(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-md"
              placeholder="הזן מזהה משתמש"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-primary text-white py-2 px-4 rounded disabled:bg-gray-400"
          >
            {loading ? 'מאשר...' : 'אשר משתמש'}
          </button>
        </form>
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