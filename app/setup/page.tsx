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
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      } else {
        router.push('/')
      }
    }
    checkUser()
  }, [router, supabase])

  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    const sanitizedUsername = username.trim().toLowerCase()

    // Explicit string validation rules
    if (sanitizedUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters.')
      return
    }
    if (sanitizedUsername.includes(' ')) {
      setErrorMsg('Username cannot contain spaces.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    // Check if the username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', sanitizedUsername)
      .maybeSingle()

    if (existingUser) {
      setErrorMsg('This username is already taken. Try another one.')
      setLoading(false)
      return
    }

    // Use UPSERT instead of UPDATE
    // This creates the row if it does not exist, or updates it if it does.
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        username: sanitizedUsername 
      })

    if (upsertError) {
      setErrorMsg('Could not save username. Please try again.')
      setLoading(false)
    } else {
      // Navigate straight to the primary timeline on success
      router.push('/feed')
    }
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
              className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black focus:border-black outline-none transition disabled:opacity-50 font-semibold"
              placeholder="username"
              maxLength={20}
            />
          </div>
          
          {errorMsg && <p className="text-red-500 text-xs font-semibold mt-2">{errorMsg}</p>}

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