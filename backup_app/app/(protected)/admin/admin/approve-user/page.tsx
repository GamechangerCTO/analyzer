'use client'

import { useState, useEffect } from 'react'
import { approveSpecificUser, approveUserById } from '@/lib/actions/users'
import { useRouter } from 'next/navigation'

export default function ApproveUserRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/admin/approve-user')
  }, [router])

  return <div className="p-6">מעביר לדף אישור משתמשים...</div>
} 