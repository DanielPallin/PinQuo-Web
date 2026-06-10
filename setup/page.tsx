'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function SetupPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [userId, setUserId] = useState<string | null>(null)
  const [authFailed, setAuthFailed] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      // 1. Give Supabase exactly 1.5 seconds to parse the URL token in the background
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 2. Ask the server for the guaranteed truth
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user && isMounted) {
        setUserId(user.id)
      } else if (isMounted) {
        // 3. If no user is found after the grace period, the token is dead
        setAuthFailed(true)
      }
    }

    initializeAuth()

    // Listen for the background token exchange success event
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && isMounted) {
        setUserId(session.user.id)
        setAuthFailed(false)
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  async function handleCompleteOnboarding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!userId) return

    const sanitizedUsername = username.trim().toLowerCase()

    if (sanitizedUsername.length < 3 || sanitizedUsername.includes(' ')) {
      setErrorMsg('Username must be at least 3 characters and contain no spaces.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
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

      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      })

      if (passwordError) {
        setErrorMsg(passwordError.message)
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

  // If the token died or was already used, show a clear message instead of a frozen screen
  if (authFailed && !userId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Link Expired</h1>
          <p className="text-slate-500 text-sm mb-6">
            This security token has already been used or has expired. Please request a new invitation.
          </p>
          <button onClick={() => router.push('/')} className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3.5 px-4 rounded-xl transition">
            Go to Homepage
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Claim Your Quotes!</h1>
        <p className="text-slate-500 text-sm mb-8">
          Choose a unique handle and account password to finish setting up your account.
        </p>

        <form onSubmit={handleCompleteOnboarding} className="space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 font-bold">@</span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading || !userId}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none font-semibold text-left disabled:opacity-50"
              placeholder={userId ? "username" : "Loading..."}
              maxLength={20}
            />
          </div>

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !userId}
            placeholder="Choose a Secure Password"
            minLength={6}
            className="w-full px-4 py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none font-semibold text-left disabled:opacity-50"
          />
          
          {errorMsg && <p className="text-red-500 text-xs font-semibold mt-2 text-left px-1">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading || username.length < 3 || !userId}
            className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center transition disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
          </button>
        </form>
      </div>
    </main>
  )
}