'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function SetupPage() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  
  const [isChecking, setIsChecking] = useState(true) 
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session && isMounted) {
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (!retrySession && isMounted) {
            router.replace('/')
          } else if (retrySession && isMounted) {
            setUserId(retrySession.user.id)
            setIsChecking(false)
          }
        }, 500)
      } else if (session && isMounted) {
        setUserId(session.user.id)
        setIsChecking(false)
      }
    }

    initializeAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && isMounted) {
        setUserId(session.user.id)
        setIsChecking(false)
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // <-- FORCED EMPTY: Prevents the React infinite render crash!

  async function handleSaveUsername(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!userId) return

    const sanitizedUsername = username.trim().toLowerCase()

    if (sanitizedUsername.length < 3 || sanitizedUsername.includes(' ')) {
      setErrorMsg('Username must be at least 3 characters and contain no spaces.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', sanitizedUsername)
        .maybeSingle()

      if (checkError) {
        setErrorMsg('Error checking username availability. Please try again.')
        setLoading(false)
        return
      }

      if (existingUser && existingUser.id !== userId) {
        setErrorMsg('This username is already taken. Try another one.')
        setLoading(false)
        return
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: userId, username: sanitizedUsername })

      if (upsertError) {
        setErrorMsg('Could not save your username. Please try again.')
        setLoading(false)
      } else {
        router.push('/feed')
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.')
      setLoading(false)
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Welcome to PinQuo!</h1>
        <p className="text-slate-500 text-sm mb-8">
          Pick a unique username to get started.
        </p>

        <form onSubmit={handleSaveUsername} className="space-y-6">
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 font-bold">@</span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none transition disabled:opacity-50 font-semibold"
              placeholder="username"
              maxLength={20}
            />
          </div>
          
          {errorMsg && <p className="text-red-500 text-xs font-semibold mt-2 text-left px-1">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading || username.length < 3}
            className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
          </button>
        </form>
      </div>
    </main>
  )
}