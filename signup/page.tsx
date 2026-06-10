'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Auto-fill if they came from an invite link
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // 1. Create the secure auth.users account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This ensures they are routed to /setup after confirming their email!
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

    // 2. Success message advising them to check their email
    alert('Success! Check your email for the confirmation link.')
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
        className="w-full px-4 py-3 rounded-xl border border-slate-200"
      />
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Choose a Password"
        minLength={6}
        className="w-full px-4 py-3 rounded-xl border border-slate-200"
      />
      {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
      <button type="submit" disabled={loading} className="w-full py-3 bg-black text-white rounded-xl font-bold">
        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Create Account'}
      </button>
    </form>
  )
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
        <h1 className="text-2xl font-black mb-6">Join PinQuo</h1>
        <Suspense fallback={<Loader2 className="animate-spin mx-auto" />}>
          <SignupForm />
        </Suspense>
      </div>
    </main>
  )
}