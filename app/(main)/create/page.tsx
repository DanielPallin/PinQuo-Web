'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

type Profile = {
  id: string
  username: string
}

export default function CreateQuotePage() {
  const router = useRouter()
  const supabase = createClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Search logic for Supabase
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.trim().length < 2) {
        setResults([])
        return
      }

      setIsSearching(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${searchTerm}%`)
        .limit(3)

      if (!error && data) {
        setResults(data)
      }
      
      setIsSearching(false)
    }

    const delayDebounceFn = setTimeout(() => {
      searchUsers()
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, supabase])

  // Routing to Step 2 (Write Page)
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser && !inviteEmail) return
    
    setLoading(true)

    if (selectedUser) {
      router.push(`/create/write?targetId=${selectedUser.id}&targetUsername=${selectedUser.username}`)
    } else if (inviteEmail) {
      router.push(`/create/write?inviteEmail=${encodeURIComponent(inviteEmail)}`)
    }
  }

  return (
    <div className="flex flex-col items-center pt-8 px-6 w-full max-w-2xl mx-auto pb-6">
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-black leading-none">PinQuo</h1>
        <p className="text-slate-500 font-bold text-xl mt-2">Create a Quote</p>
      </div>

      <form onSubmit={handleContinue} className="w-full flex flex-col items-center flex-1">
        
        <h2 className="text-2xl font-bold text-slate-700 mb-4 text-center">
          Who do you want to quote?
        </h2>

        <div className="w-full mb-2">
          <p className="text-center text-slate-500 mb-2 font-bold text-base">Username</p>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setSelectedUser(null)
              setInviteEmail('')
            }}
            placeholder="Search..."
            className="w-full py-4 px-6 bg-slate-100 text-slate-900 text-center text-xl rounded-full focus:outline-none focus:ring-[4px] focus:ring-slate-200 transition font-bold"
          />
        </div>

        {/* Dynamic Search Results / Spacing */}
        <div className="flex flex-col items-center w-full max-w-[320px] min-h-[140px] justify-start">
          {searchTerm.length >= 2 && !selectedUser && (
            <>
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-black mt-2 mb-2" />
              {isSearching ? (
                <Loader2 className="w-8 h-8 animate-spin text-slate-400 my-4" />
              ) : results.length > 0 ? (
                results.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(profile)
                      setSearchTerm(profile.username)
                      setResults([])
                    }}
                    className="w-full py-3 px-6 rounded-full text-base font-bold transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 mb-2 shadow-sm"
                  >
                    {profile.username}
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-400 font-bold my-4 uppercase tracking-wider">No users found</p>
              )}
            </>
          )}

          {selectedUser && (
             <>
               <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-black mt-2 mb-2" />
               <div className="w-full py-3 px-6 rounded-full text-lg font-black bg-[#bbf7d0] text-emerald-950 text-center shadow-md ring-[4px] ring-emerald-200">
                 {selectedUser.username}
               </div>
             </>
          )}
        </div>

        <div className="w-full mt-auto flex flex-col items-center">
          <h3 className="text-xl font-black text-slate-800 text-center leading-tight mb-1">
            User <span className="text-red-500">not</span> on PinQuo?
          </h3>
          <p className="text-slate-500 text-center mb-4 text-base font-bold">
            Quote email to send invitation
          </p>
          
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => {
              setInviteEmail(e.target.value)
              setSearchTerm('')
              setSelectedUser(null)
            }}
            placeholder="example@example.com"
            className="w-full py-4 px-6 bg-slate-100 text-slate-900 text-center text-lg rounded-full focus:outline-none focus:ring-[4px] focus:ring-slate-200 transition font-bold mb-6"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (!selectedUser && !inviteEmail)}
          className="w-full max-w-[400px] bg-[#bbf7d0] text-emerald-950 hover:bg-[#86efac] active:scale-95 disabled:opacity-50 disabled:hover:bg-[#bbf7d0] disabled:active:scale-100 font-black text-2xl py-5 px-14 rounded-[32px] transition-all duration-200 shadow-lg border-[4px] border-emerald-200"
        >
          {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : 'Continue'}
        </button>

      </form>
    </div>
  )
}