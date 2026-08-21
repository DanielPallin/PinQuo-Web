'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const [isCheckingSession, setIsCheckingSession] = useState(true) 
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && isMounted) {
        router.push('/feed')
      } else if (isMounted) {
        setIsCheckingSession(false)
      }
    }
    
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && isMounted) {
        router.push('/feed')
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase.auth])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    if (isLogin) {
      // LOG IN FLOW
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setErrorMsg(error.message)
      setLoading(false)
    } else {

      const sanitizedUsername = username.trim().toLowerCase()

      // Validate Username Format
      if (sanitizedUsername.length < 3 || sanitizedUsername.includes(' ')) {
        setErrorMsg('Username must be at least 3 characters and contain no spaces.')
        setLoading(false)
        return
      }

      // Check if Username is already taken in the profiles table
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

      if (existingUser) {
        setErrorMsg('This username is already taken. Try another one.')
        setLoading(false)
        return
      }

      // Create the account and pass the username to user metadata
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            username: sanitizedUsername
          }
        }
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg('Success! Please check your inbox to verify your account.')
        setEmail('')
        setPassword('')
        setUsername('')
      }
      setLoading(false)
    }
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl border border-slate-100 p-8">
        
        <div className="flex flex-col items-center text-center mb-8">
            <Image
              src="/PinQuote-logo.png" 
              alt="PinQuo Logo"
              width={130}
              height={40}
              priority
              className="h-9 w-auto object-contain mb-6" 
            />
          <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
            {isLogin ? 'PinQuote' : 'Join PinQuote'}
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            The social network for memorable quotes.
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              !isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black focus:border-black outline-none transition disabled:opacity-50 font-medium"
              placeholder="you@example.com"
            />
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="username" className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 font-bold">@</span>
                <input
                  id="username"
                  type="text"
                  required={!isLogin}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  maxLength={20}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black focus:border-black outline-none transition disabled:opacity-50 font-medium"
                  placeholder="username"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black focus:border-black outline-none transition disabled:opacity-50 font-medium"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-600 text-sm font-semibold rounded-xl border border-red-100">
              {errorMsg}
            </div>
          )}
          
          {successMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl border border-emerald-100">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-slate-800 text-white font-bold text-lg py-4 px-4 rounded-xl flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 mt-2"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              isLogin ? 'Log In' : 'Create Account'
            )}
          </button>
        </form>

      </div>
    </main>
  )
}