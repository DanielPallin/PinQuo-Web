'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Search, Mail, User as UserIcon, X, CheckCircle2 } from 'lucide-react'

type Profile = {
  id: string
  username: string
  avatar_url: string | null
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
        .select('id, username, avatar_url')
        .ilike('username', `%${searchTerm}%`)
        .limit(4)

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
    
    if (!selectedUser && !inviteEmail && searchTerm.trim().length === 0) return
    
    setLoading(true)

    if (selectedUser) {
      router.push(`/create/write?targetId=${selectedUser.id}&targetUsername=${selectedUser.username}`)
    } else if (inviteEmail) {
      router.push(`/create/write?inviteEmail=${encodeURIComponent(inviteEmail)}`)
    } else if (searchTerm.trim().length > 0) {
      router.push(`/create/write?customName=${encodeURIComponent(searchTerm.trim())}`)
    } else {
      setLoading(false)
    }
  }

  const clearSelection = () => {
    setSelectedUser(null)
    setSearchTerm('')
  }

  const isFormValid = selectedUser || inviteEmail.trim().length > 0 || searchTerm.trim().length > 0

  return (
    <div className="flex flex-col pt-6 px-4 w-full max-w-md mx-auto min-h-[calc(100vh-100px)] pb-8 bg-slate-50/50">
      
      {/* Sleek App Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-200 rounded-full transition text-slate-700 -ml-2"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black text-slate-900">PinQuote</h1>
          <p className="text-xs font-bold text-slate-400">CREATE QUOTE</p>
        </div>
        <div className="w-10"></div> {/* Spacer for perfect centering */}
      </div>

      <form onSubmit={handleContinue} className="w-full flex flex-col flex-1">
        
        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col gap-6 relative z-20">
          
          <div className="text-center mb-2">
            <h2 className="text-xl font-bold text-slate-800">Who are you quoting?</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Search a user, write a custom name, or invite via email.</p>
          </div>

          {/* Section 1: App Search / Custom Name */}
          <div className="relative flex flex-col">
            {selectedUser ? (
              <div className="flex items-center justify-between bg-[#bbf7d0] border-2 border-emerald-200 rounded-2xl p-4 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 overflow-hidden border border-emerald-200">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-emerald-700" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Selected User</span>
                    <span className="text-lg font-black text-emerald-950 leading-none">@{selectedUser.username}</span>
                  </div>
                </div>
                <button type="button" onClick={clearSelection} className="p-2 bg-emerald-200/50 hover:bg-emerald-300 rounded-full transition text-emerald-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setInviteEmail('') // Mutually exclusive UX
                  }}
                  placeholder="Username or Custom Name"
                  className="w-full py-4 pl-12 pr-4 bg-slate-50 border border-slate-200 text-slate-900 text-[15px] font-medium rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all placeholder:text-slate-400"
                />
                {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-slate-300" />}
              </div>
            )}

            {/* Floating Search Results Dropdown */}
            {searchTerm.length >= 2 && !selectedUser && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                {results.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(profile)
                      setSearchTerm(profile.username)
                      setResults([])
                    }}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition border-b border-slate-50 last:border-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                       {profile.avatar_url ? (
                         <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                       ) : (
                         <UserIcon className="w-4 h-4 text-slate-400" />
                       )}
                    </div>
                    <span className="font-bold text-slate-800 text-[15px]">{profile.username}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Custom Name Fallback Hint */}
            {searchTerm.length >= 2 && !selectedUser && !isSearching && results.length === 0 && (
              <div className="mt-3 text-center">
                <span className="text-[13px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Will be quoted as "{searchTerm}"
                </span>
              </div>
            )}
          </div>

          {/* Elegant Divider */}
          <div className="flex items-center gap-4 my-2">
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          {/* Section 2: Email Invite */}
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value)
                setSearchTerm('')
                setSelectedUser(null)
              }}
              placeholder="Invite via email address"
              className="w-full py-4 pl-12 pr-4 bg-slate-50 border border-slate-200 text-slate-900 text-[15px] font-medium rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 pt-8">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full bg-[#bbf7d0] text-emerald-950 hover:bg-[#86efac] active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-[#bbf7d0] disabled:active:scale-100 font-black text-xl py-4 px-6 rounded-full transition-all duration-200 shadow-md border-4 border-emerald-200 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continue to Templates'}
          </button>
        </div>

      </form>
    </div>
  )
}