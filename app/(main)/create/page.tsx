'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Search, Mail, User as UserIcon, X, CheckCircle2, ArrowRight } from 'lucide-react'

type Profile = {
  id: string
  username: string
  avatar_url: string | null
}

export default function CreateQuotePage() {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Supabase Debounced Search
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

      if (!error && data) setResults(data)
      setIsSearching(false)
    }

    const delayDebounceFn = setTimeout(() => searchUsers(), 300)
    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, supabase])

  // Routing Logic
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser && !inviteEmail && searchTerm.trim().length === 0) return
    setLoading(true)

    if (selectedUser) {
      router.push(`/create/write?targetId=${selectedUser.id}&targetUsername=${selectedUser.username}`)
    } else if (inviteEmail) {
      router.push(`/create/write?inviteEmail=${encodeURIComponent(inviteEmail.trim())}`)
    } else if (searchTerm.trim().length > 0) {
      router.push(`/create/write?customName=${encodeURIComponent(searchTerm.trim())}`)
    } else {
      setLoading(false)
    }
  }

  // UX Reset Handlers
  const clearSelection = () => {
    setSelectedUser(null)
    setSearchTerm('')
  }

  const handleSearchInput = (value: string) => {
    setSearchTerm(value)
    if (inviteEmail) setInviteEmail('') // Clear email if they start searching
    if (selectedUser) setSelectedUser(null)
  }

  const handleEmailInput = (value: string) => {
    setInviteEmail(value)
    if (searchTerm) setSearchTerm('') // Clear search if they start typing email
    if (selectedUser) setSelectedUser(null)
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight">PinQuo</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Target</p>
        </div>
        <div className="w-10"></div> 
      </div>

      <form onSubmit={handleContinue} className="w-full flex flex-col flex-1">
        
        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/40 border border-slate-100 p-6 sm:p-8 flex flex-col gap-6 relative z-20">
          
          <div className="text-center mb-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Who said it?</h2>
            <p className="text-sm font-medium text-slate-500 mt-2">Search for an existing user, type a custom name, or invite via email.</p>
          </div>

          {/* Section 1: App Search / Custom Name */}
          <div className="relative flex flex-col">
            {selectedUser ? (
              <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 transition-all animate-in zoom-in-95 duration-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden border border-emerald-200 shadow-sm">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Selected User</span>
                    <span className="text-lg font-black text-slate-900 leading-none mt-0.5">@{selectedUser.username}</span>
                  </div>
                </div>
                <button type="button" onClick={clearSelection} className="p-2 bg-emerald-100 hover:bg-emerald-200 rounded-full transition text-emerald-700 active:scale-95">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Search user or type name..."
                  className="w-full py-4 pl-12 pr-12 bg-slate-50 border border-slate-200 text-slate-900 text-[15px] font-medium rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all placeholder:text-slate-400"
                />
                
                {/* Search State Indicators (Spinner or Clear Button) */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                  ) : searchTerm.length > 0 ? (
                    <button type="button" onClick={() => setSearchTerm('')} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* Floating Search Results Dropdown */}
            {searchTerm.length >= 2 && !selectedUser && results.length > 0 && (
              <div className="absolute top-[110%] left-0 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                {results.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(profile)
                      setSearchTerm(profile.username)
                      setResults([])
                    }}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 active:bg-slate-100 transition border-b border-slate-50 last:border-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
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
              <div className="mt-3 text-center animate-in fade-in">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-full inline-flex items-center gap-2 border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 
                  Quote as <span className="text-slate-800">"{searchTerm}"</span>
                </span>
              </div>
            )}
          </div>

          {/* Elegant Divider */}
          <div className="flex items-center gap-4 my-2">
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          {/* Section 2: Email Invite */}
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => handleEmailInput(e.target.value)}
              placeholder="Invite via email address"
              className="w-full py-4 pl-12 pr-12 bg-slate-50 border border-slate-200 text-slate-900 text-[15px] font-medium rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all placeholder:text-slate-400"
            />
            {/* Clear Button for Email */}
            {inviteEmail.length > 0 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center animate-in fade-in">
                <button type="button" onClick={() => setInviteEmail('')} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 pt-4">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full bg-[#bbf7d0] text-emerald-950 hover:bg-[#86efac] active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-[#bbf7d0] disabled:active:scale-100 font-black text-xl py-4 px-6 rounded-full transition-all duration-200 shadow-md border-4 border-emerald-200 flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Write Quote 
                <ArrowRight className="w-5 h-5 group-disabled:opacity-0 transition-opacity" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  )
}