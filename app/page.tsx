'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // If Supabase accidentally drops an authenticated onboarding user on the root login screen,
    // catch the secure hash fragment and seamlessly bounce them to the setup portal.
    if (window.location.hash.includes('access_token') || window.location.hash.includes('type=invite')) {
      router.push('/setup')
    }
  }, [router])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setErrorMsg(error.message)
      else router.push('/feed') 
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg('Success! Please check your inbox to verify your account.')
      }
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            {isLogin ? 'Welcome back to PinQuo' : 'Join PinQuo'}
          </h1>
          <p className="text-gray-500 text-sm">
            The social network for memorable quotes.
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-white text-slate-900 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-black outline-none transition disabled:opacity-50 font-medium"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-white text-slate-900 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-black outline-none transition disabled:opacity-50 font-medium"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg" role="alert">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg" role="alert">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-600">
          <span>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            className="font-semibold text-black hover:text-gray-700 underline underline-offset-4 decoration-2 transition disabled:opacity-50"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>

      </div>
    </main>
  )
}