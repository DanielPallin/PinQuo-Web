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
    // Grab the current logged in user ID when the page mounts
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

    // Basic validation
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

    // FIX 1: Use maybeSingle() instead of single() to prevent "No rows found" errors
    const { data: existingUser, error: searchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', sanitizedUsername)
      .maybeSingle()

    if (searchError) {
      setErrorMsg('Error checking username availability.')
      setLoading(false)
      return
    }

    // Check if the username is taken by someone else
    if (existingUser && existingUser.id !== userId) {
      setErrorMsg('This username is already taken. Try another one.')
      setLoading(false)
      return
    }

    // Update the profile table with the chosen username
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: sanitizedUsername })
      .eq('id', userId)

    if (updateError) {
      setErrorMsg(updateError.message)
      setLoading(false)
    } else {
      // FIX 2: Force a hard window navigation to break out of the Next.js cache loop
      window.location.href = '/feed'
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
        
        <h1 className="text-2xl font-black text-slate-900 mb-2">
          Welcome to PinQuo!
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          You are successfully verified. Pick a unique username to start quoting and getting quoted.
        </p>

        <form onSubmit={handleSaveUsername} className="space-y-6">
          <div>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 font-bold">
                @
              </span>
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
            {errorMsg && (
              <p className="text-red-500 text-xs font-semibold mt-2 text-left px-2">{errorMsg}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || username.length === 0}
            className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Complete Setup'
            )}
          </button>
        </form>

      </div>
    </main>
  )
}