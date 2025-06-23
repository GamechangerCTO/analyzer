'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          router.push('/login')
          return
        }
        
        setUserEmail(user.email || null)
        
        if (!user.email) {
          setError("לא נמצא כתובת אימייל למשתמש")
          setLoading(false)
          return
        }
        
        if (user.email === 'ido.segev23@gmail.com') {
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email!)
            .maybeSingle()
          
          if (!existingUser) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                role: 'admin',
                full_name: 'מנהל מערכת',
                company_id: '11111111-1111-1111-1111-111111111111',
                is_approved: true
              })
            
            if (insertError) {
              setError(`שגיאה ביצירת משתמש: ${insertError.message}`)
              setLoading(false)
              return
            }
          }
          
          router.push('/dashboard/admin')
          return
        }
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, company_id, is_approved')
          .eq('email', user.email!)
          .single()
        
        if (userError) {
          const { data: userDataById, error: userByIdError } = await supabase
            .from('users')
            .select('role, company_id, is_approved')
            .eq('id', user.id)
            .single()
          
          if (userByIdError || !userDataById) {
            setError(`לא ניתן למצוא את המשתמש במערכת. אנא פנה למנהל.`)
            setLoading(false)
            return
          }
          
          if (!userDataById.is_approved) {
            router.push('/not-approved?reason=pending')
            return
          }
          
          if (userDataById.role === 'admin') {
            router.push('/dashboard/admin')
            return
          } else if (userDataById.role === 'manager') {
            router.push('/dashboard/manager')
          } else if (userDataById.role === 'agent') {
            router.push('/dashboard/agent')
          } else {
            setError(`תפקיד לא מוכר: ${userDataById.role}`)
            setLoading(false)
          }
          
          return
        }
        
        if (!userData) {
          router.push('/not-approved?reason=not-found')
          return
        }
        
        if (!userData.is_approved) {
          router.push('/not-approved?reason=pending')
          return
        }
        
        if (userData.role === 'admin') {
          router.push('/dashboard/admin')
          return
        } else if (userData.role === 'manager') {
          router.push('/dashboard/manager')
        } else if (userData.role === 'agent') {
          router.push('/dashboard/agent')
        } else {
          setError(`תפקיד לא מוכר: ${userData.role}`)
          setLoading(false)
        }
      } catch (err) {
        setError(`שגיאה לא צפויה: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-lg">טוען...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">שגיאה</h2>
          <p className="text-gray-700">{error}</p>
          <div className="mt-6">
            <button 
              onClick={() => router.push('/login')}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              חזרה לדף התחברות
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50" style={{ overflow: isSideMenuOpen ? 'hidden' : 'auto' }}>
      {/* Desktop sidebar */}
      <aside className="z-20 flex-shrink-0 hidden w-60 pl-2 overflow-y-auto bg-white shadow-lg md:block">
        <div>
          <div className="text-gray-800">
            <div className="flex p-2 bg-white border-b border-gray-200">
              <div className="flex py-3 px-2 items-center">
                <p className="text-2xl text-blue-600 font-semibold">KA</p>
                <p className="ml-2 font-semibold italic text-gray-700">אנליזר</p>
              </div>
            </div>
            <div className="flex justify-center py-6">
              <div className="">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-blue-200">
                  <span className="text-white text-2xl font-bold">מנ</span>
                </div>
                <p className="font-bold text-base text-gray-600 pt-2 text-center w-24">מנהל מערכת</p>
              </div>
            </div>
            <div>
              <ul className="mt-6 leading-10">
                <li className="relative px-2 py-1">
                  <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600 bg-blue-50 rounded-md px-3 py-2" 
                        href="/dashboard">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="ml-4">דשבורד</span>
                  </Link>
                </li>
                <li className="relative px-2 py-1">
                  <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600 px-3 py-2" 
                        href="/dashboard/admin/users">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span className="ml-4">ניהול משתמשים</span>
                  </Link>
                </li>
                <li className="relative px-2 py-1">
                  <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600 px-3 py-2" 
                        href="/dashboard/admin/companies">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="ml-4">ניהול חברות</span>
                  </Link>
                </li>
                <li className="relative px-2 py-1">
                  <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600 px-3 py-2" 
                        href="/dashboard/admin/company-quotas">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="ml-4">ניהול מכסות משתמשים</span>
                  </Link>
                </li>
                <li className="relative px-2 py-1">
                  <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600 px-3 py-2" 
                        href="/upload">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="ml-4">העלאת שיחה</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {isSideMenuOpen && (
        <div 
          className="fixed inset-0 z-10 flex items-end bg-black bg-opacity-50 sm:items-center sm:justify-center"
          onClick={() => setIsSideMenuOpen(false)}
        ></div>
      )}

      {/* Mobile sidebar */}
      {isSideMenuOpen && (
        <aside className="fixed inset-y-0 z-20 flex-shrink-0 w-64 mt-16 overflow-y-auto bg-white shadow-lg md:hidden">
          <div>
            <div className="text-gray-800">
              <div className="flex p-2 bg-white border-b border-gray-200">
                <div className="flex py-3 px-2 items-center">
                  <p className="text-2xl text-blue-600 font-semibold">KA</p>
                  <p className="ml-2 font-semibold italic text-gray-700">אנליזר</p>
                </div>
              </div>
              <div>
                <ul className="mt-6 leading-10">
                  <li className="relative px-2 py-1">
                    <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600"
                          href="/dashboard">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="ml-4">דשבורד</span>
                    </Link>
                  </li>
                  <li className="relative px-2 py-1">
                    <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600"
                          href="/dashboard/admin/users">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <span className="ml-4">ניהול משתמשים</span>
                    </Link>
                  </li>
                  <li className="relative px-2 py-1">
                    <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600"
                          href="/dashboard/admin/companies">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="ml-4">ניהול חברות</span>
                    </Link>
                  </li>
                  <li className="relative px-2 py-1">
                    <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600"
                          href="/dashboard/admin/company-quotas">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="ml-4">ניהול מכסות משתמשים</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </aside>
      )}

      <div className="flex flex-col flex-1 w-full overflow-y-auto">
        <header className="z-40 py-4 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-8 px-6 mx-auto">
            {/* Mobile hamburger */}
            <button className="p-1 mr-5 -ml-1 rounded-md md:hidden focus:outline-none focus:shadow-outline-blue"
                    onClick={() => setIsSideMenuOpen(!isSideMenuOpen)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-600" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>

            {/* Search Input */}
            <div className="flex justify-center mt-2 mr-4">
              <div className="relative flex w-full flex-wrap items-stretch mb-3">
                <input type="search" placeholder="חיפוש..."
                       className="form-input px-3 py-2 placeholder-gray-400 text-gray-700 relative bg-white rounded-lg text-sm border border-gray-300 shadow-sm outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full pr-10" />
                <span className="z-10 h-full leading-snug font-normal text-center text-gray-400 absolute bg-transparent rounded text-base items-center justify-center w-8 right-0 pr-3 py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 -mt-1" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
            </div>

            <ul className="flex items-center flex-shrink-0 space-x-6">
              {/* Notifications menu */}
              <li className="relative">
                <button
                  className="p-2 bg-gray-100 text-blue-600 align-middle rounded-full hover:text-white hover:bg-blue-600 focus:outline-none transition-colors duration-200"
                  onClick={() => setIsNotificationsMenuOpen(!isNotificationsMenuOpen)}>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <span className="absolute top-0 right-0 inline-block w-3 h-3 transform translate-x-1 -translate-y-1 bg-red-500 border-2 border-white rounded-full"></span>
                </button>
                {isNotificationsMenuOpen && (
                  <ul className="absolute right-0 w-56 p-2 mt-2 space-y-2 text-gray-600 bg-white border border-gray-200 rounded-md shadow-lg">
                    <li className="flex">
                      <a className="text-gray-700 inline-flex items-center justify-between w-full px-2 py-1 text-sm font-semibold transition-colors duration-150 rounded-md hover:bg-gray-100"
                         href="#">
                        <span>הודעות</span>
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-600 bg-red-100 rounded-full">
                          13
                        </span>
                      </a>
                    </li>
                  </ul>
                )}
              </li>

              {/* Profile menu */}
              <li className="relative">
                <button
                  className="p-2 bg-gray-100 text-blue-600 align-middle rounded-full hover:text-white hover:bg-blue-600 focus:outline-none transition-colors duration-200"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </button>
                {isProfileMenuOpen && (
                  <ul className="absolute right-0 w-56 p-2 mt-2 space-y-2 text-gray-600 bg-white border border-gray-200 rounded-md shadow-lg">
                    <li className="flex">
                      <Link className="text-gray-700 inline-flex items-center w-full px-2 py-1 text-sm font-semibold transition-colors duration-150 rounded-md hover:bg-gray-100"
                            href="/profile">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>פרופיל</span>
                      </Link>
                    </li>
                    <li className="flex">
                      <button 
                        onClick={() => {
                          supabase.auth.signOut()
                          router.push('/login')
                        }}
                        className="text-gray-700 inline-flex items-center w-full px-2 py-1 text-sm font-semibold transition-colors duration-150 rounded-md hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>התנתקות</span>
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            </ul>
          </div>
        </header>

        <main className="flex-1 pb-16">
          <div className="grid mb-4 pb-10 px-8 mx-4 rounded-3xl bg-white border border-gray-200 shadow-lg mt-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="grid grid-cols-12 col-span-12 gap-6">
                <div className="col-span-12 mt-8">
                  <div className="flex items-center h-10 intro-y">
                    <h2 className="mr-5 text-lg font-medium truncate text-gray-800">דשבורד מנהל מערכת</h2>
                  </div>
                  {userEmail && (
                    <div className="mb-6 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <p className="text-blue-800">מחובר כ: {userEmail}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-12 gap-6 mt-5">
                    <Link href="/dashboard/admin/users" className="transform hover:scale-105 transition duration-300 shadow-xl rounded-lg col-span-12 sm:col-span-6 xl:col-span-3 intro-y bg-white border border-gray-200">
                      <div className="p-5">
                        <div className="flex justify-between">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <div className="bg-blue-100 text-blue-600 rounded-full h-6 px-2 flex justify-items-center font-semibold text-sm">
                            <span className="flex items-center">חדש</span>
                          </div>
                        </div>
                        <div className="ml-2 w-full flex-1">
                          <div>
                            <div className="mt-3 text-3xl font-bold leading-8 text-gray-800">ניהול</div>
                            <div className="mt-1 text-base text-gray-600">משתמשים</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    <Link href="/dashboard/admin/companies" className="transform hover:scale-105 transition duration-300 shadow-xl rounded-lg col-span-12 sm:col-span-6 xl:col-span-3 intro-y bg-white border border-gray-200">
                      <div className="p-5">
                        <div className="flex justify-between">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <div className="bg-green-100 text-green-600 rounded-full h-6 px-2 flex justify-items-center font-semibold text-sm">
                            <span className="flex items-center">פעיל</span>
                          </div>
                        </div>
                        <div className="ml-2 w-full flex-1">
                          <div>
                            <div className="mt-3 text-3xl font-bold leading-8 text-gray-800">ניהול</div>
                            <div className="mt-1 text-base text-gray-600">חברות</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    <Link href="/upload" className="transform hover:scale-105 transition duration-300 shadow-xl rounded-lg col-span-12 sm:col-span-6 xl:col-span-3 intro-y bg-white border border-gray-200">
                      <div className="p-5">
                        <div className="flex justify-between">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <div className="bg-purple-100 text-purple-600 rounded-full h-6 px-2 flex justify-items-center font-semibold text-sm">
                            <span className="flex items-center">חדש</span>
                          </div>
                        </div>
                        <div className="ml-2 w-full flex-1">
                          <div>
                            <div className="mt-3 text-3xl font-bold leading-8 text-gray-800">העלאת</div>
                            <div className="mt-1 text-base text-gray-600">שיחה לניתוח</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    <Link href="/simulations" className="transform hover:scale-105 transition duration-300 shadow-xl rounded-lg col-span-12 sm:col-span-6 xl:col-span-3 intro-y bg-white border border-gray-200">
                      <div className="p-5">
                        <div className="flex justify-between">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <div className="bg-orange-100 text-orange-600 rounded-full h-6 px-2 flex justify-items-center font-semibold text-sm">
                            <span className="flex items-center">חם</span>
                          </div>
                        </div>
                        <div className="ml-2 w-full flex-1">
                          <div>
                            <div className="mt-3 text-3xl font-bold leading-8 text-gray-800">סימולציות</div>
                            <div className="mt-1 text-base text-gray-600">אימון קולי</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
                
                <div className="col-span-12 mt-5">
                  <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                    <div className="bg-white shadow-lg border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">סטטיסטיקות מערכת</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">משתמשים רשומים</span>
                          <span className="font-semibold text-gray-800">247</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">חברות פעילות</span>
                          <span className="font-semibold text-gray-800">34</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">שיחות נותחו</span>
                          <span className="font-semibold text-gray-800">1,842</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white shadow-lg border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">פעילות אחרונה</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                          <span className="text-sm text-gray-600">משתמש חדש נרשם</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                          <span className="text-sm text-gray-600">שיחה חדשה נותחה</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                          <span className="text-sm text-gray-600">חברה חדשה נוספה</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 