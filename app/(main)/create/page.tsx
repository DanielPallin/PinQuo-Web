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
        .limit(3) // Reduced to 3 to keep the container height predictable

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
    <div className="flex flex-col items-center pt-4 px-4 w-full max-w-md mx-auto">
      
      {/* Header - Reduced margin from mb-10 to mb-4 */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-black text-black">PinQuo</h1>
        <p className="text-slate-500 font-medium text-lg mt-1">Create a Quote</p>
      </div>

      <form onSubmit={handleContinue} className="w-full flex flex-col items-center">
        
        {/* Search Section - Reduced margin from mb-6 to mb-4 */}
        <h2 className="text-[22px] font-bold text-slate-700 mb-4 text-center">
          Who do you want to quote?
        </h2>

        <div className="w-full mb-1">
          <p className="text-center text-slate-500 mb-2 font-medium">Username</p>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setSelectedUser(null)
              setInviteEmail('')
            }}
            placeholder="Search..."
            className="w-full py-3.5 px-6 bg-slate-100 text-slate-900 text-center text-xl rounded-full focus:outline-none focus:ring-2 focus:ring-slate-200 transition font-semibold"
          />
        </div>

        {/* Dropdown Results - Reduced min-height from 160px to 120px */}
        {searchTerm.length >= 2 && !selectedUser && (
          <div className="flex flex-col items-center gap-2 w-full max-w-[280px] min-h-[120px]">
            <div className="w-0 h-0 border-l-10 border-l-transparent border-r-10 border-r-transparent border-t-10 border-t-black mb-1 mt-1" />
            
            {isSearching ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-400 my-4" />
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
                  className="w-full py-2.5 px-6 rounded-full font-semibold transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  {profile.username}
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-400 font-medium my-4">No users found</p>
            )}
          </div>
        )}

        {/* Show selected state (Green Pill) */}
        {selectedUser && (
           <div className="flex flex-col items-center gap-2 w-full max-w-[280px] min-h-[120px]">
             <div className="w-0 h-0 border-l-10 border-l-transparent border-r-10 border-r-transparent border-t-10 border-t-black mb-1 mt-1" />
             <div className="w-full py-2.5 px-6 rounded-full font-semibold bg-[#bbf7d0] text-emerald-900 text-center">
               {selectedUser.username}
             </div>
           </div>
        )}

        {/* Spacer - Reduced from 160px to 120px */}
        {searchTerm.length < 2 && <div className="h-[120px]" />}

        {/* Email Invitation Section */}
        <div className="w-full mt-1 flex flex-col items-center">
          <h3 className="text-xl font-bold text-slate-700 text-center mb-1">
            User <span className="text-red-500">not</span> on PinQuo?
          </h3>
          <p className="text-slate-500 text-center mb-3">
            Quote email to send invitation
          </p>
          <p className="text-green-500 text-center mb-3">
            (Quote will still be published)
          </p>
          
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => {
              setInviteEmail(e.target.value)
              setSearchTerm('')
              setSelectedUser(null)
            }}
            placeholder="someone@example.com"
            // Reduced bottom margin from mb-10 to mb-6
            className="w-full py-3.5 px-6 bg-slate-100 text-slate-900 text-center text-lg rounded-full focus:outline-none focus:ring-2 focus:ring-slate-200 transition font-medium mb-6"
          />
        </div>

        {/* Continue Button */}
        <button
          type="submit"
          disabled={loading || (!selectedUser && !inviteEmail)}
          className="bg-[#bbf7d0] text-emerald-900 hover:bg-[#86efac] active:scale-95 disabled:opacity-50 disabled:hover:bg-[#bbf7d0] disabled:active:scale-100 font-bold text-xl py-3.5 px-14 rounded-full transition-all duration-200 shadow-sm"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Continue'}
        </button>

      </form>
    </div>
  )
}