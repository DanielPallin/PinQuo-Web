'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/setup`
      }
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    if (data.user?.identities?.length === 0) {
      setErrorMsg('This email is already registered. Please log in.')
      setLoading(false)
      return
    }

    alert('Account initialized! Please check your email inbox for your verification link.')
    router.push('/')
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email Address"
        className="w-full px-4 py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none font-medium"
      />
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Choose a Password"
        minLength={6}
        className="w-full px-4 py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none font-medium"
      />
      {errorMsg && <p className="text-red-500 text-xs font-semibold text-left px-1">{errorMsg}</p>}
      <button 
        type="submit" 
        disabled={loading} 
        className="w-full py-3.5 bg-black hover:bg-gray-800 text-white rounded-xl font-bold transition disabled:opacity-50 cursor-pointer"
      >
        {loading ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : 'Continue'}
      </button>
    </form>
  )
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Join PinQuo</h1>
        <p className="text-slate-500 text-sm mb-6">Create an account to protect your quote history.</p>
        <Suspense fallback={<Loader2 className="animate-spin mx-auto text-slate-400 w-8 h-8" />}>
          <SignupForm />
        </Suspense>
      </div>
    </main>
  )
}