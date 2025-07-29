'use client'

import { useState } from 'react'
import { createClient, clearAuthStorage } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

export default function TestAuthPage() {
  const [status, setStatus] = useState<string>('Ready')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const clearSession = async () => {
    setLoading(true)
    setStatus('Clearing session and storage...')
    setError(null)
    
    try {
      // First clear Supabase session
      const { error } = await supabase.auth.signOut()
      
      // Then clear all browser storage
      clearAuthStorage()
      
      if (error) {
        setError(`Error signing out: ${error.message}`)
      } else {
        setStatus('✅ Session and storage cleared successfully! Please wait 1 minute before trying to login again.')
      }
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const forceReset = () => {
    setLoading(true)
    setStatus('Force clearing all auth data...')
    setError(null)
    
    try {
      clearAuthStorage()
      setStatus('✅ Force reset complete! All auth data cleared. Wait 1 minute then refresh the page.')
    } catch (err: any) {
      setError(`Reset error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkSession = async () => {
    setLoading(true)
    setStatus('Checking session...')
    setError(null)
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        setError(`Session error: ${error.message}`)
      } else if (session) {
        setStatus(`Session found for: ${session.user.email}`)
      } else {
        setStatus('No active session')
      }
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setLoading(true)
    setStatus('Testing connection...')
    setError(null)
    
    try {
      // Simple query to test connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (error) {
        setError(`Connection error: ${error.message}`)
      } else {
        setStatus('Connection successful')
      }
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg-light via-white to-brand-accent-light flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Current Status:</p>
            <p className="font-medium">{status}</p>
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={forceReset} 
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              🔧 Force Reset (Fix Rate Limit)
            </Button>
            
            <Button 
              onClick={clearSession} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear Session & Storage
            </Button>
            
            <Button 
              onClick={checkSession} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Check Session
            </Button>
            
            <Button 
              onClick={testConnection} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Test Connection
            </Button>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={() => window.location.href = '/login'} 
              disabled={loading}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 