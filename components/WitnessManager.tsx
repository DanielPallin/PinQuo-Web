'use client'

import { useState, useEffect, useRef } from 'react'
import { UserSearch, X, Search, Mail, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type Witness = {
  type: 'user' | 'email'
  value: string
  display: string
}

interface WitnessManagerProps {
  witnesses: Witness[]
  onChange: (witnesses: Witness[]) => void
}

export default function WitnessManager({ witnesses, onChange }: WitnessManagerProps) {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)

  const maxWitnesses = 5
  const canAddMore = witnesses.length < maxWitnesses

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(5)
      
      if (data) setSearchResults(data)
      setIsSearching(false)
    }

    const timer = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, supabase])

  const handleAddUser = (user: any) => {
    if (!canAddMore || witnesses.some(w => w.value === user.id)) return
    onChange([...witnesses, { type: 'user', value: user.id, display: user.username }])
    setSearchQuery('')
    setIsOpen(false)
  }

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!canAddMore || !emailRegex.test(searchQuery) || witnesses.some(w => w.value === searchQuery)) return
    
    onChange([...witnesses, { type: 'email', value: searchQuery, display: searchQuery }])
    setSearchQuery('')
    setIsOpen(false)
  }

  const removeWitness = (valueToRemove: string) => {
    onChange(witnesses.filter(w => w.value !== valueToRemove))
  }

  return (
    <div className="relative flex flex-col gap-3 w-full my-4" ref={containerRef}>
      
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={!canAddMore}
          className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl font-bold border border-emerald-300 hover:bg-emerald-200 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
        >
          <UserSearch className="w-5 h-5" />
          Add Witnesses {witnesses.length > 0 && `(${witnesses.length}/${maxWitnesses})`}
        </button>

        {witnesses.map((witness) => (
          <div key={witness.value} className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-sm font-bold animate-in zoom-in-95 duration-200">
            {witness.type === 'email' ? <Mail className="w-3.5 h-3.5 text-slate-400" /> : <Check className="w-3.5 h-3.5 text-emerald-500" />}
            {witness.display}
            <button type="button" onClick={() => removeWitness(witness.value)} className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Dropdown Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-full sm:w-[350px] bg-white rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="p-3 border-b border-slate-100 flex items-center gap-3 relative bg-slate-50/50">
            <Search className="w-5 h-5 text-slate-400 absolute left-6" />
            <form onSubmit={handleAddEmail} className="w-full">
              <input
                type="text"
                autoFocus
                placeholder="Search username or enter email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all text-sm font-medium shadow-sm"
              />
            </form>
          </div>

          <div className="max-h-[260px] overflow-y-auto p-2 no-scrollbar bg-white">
            {searchResults.length > 0 ? (
              searchResults.map(user => (
                <button key={user.id} onClick={() => handleAddUser(user)} className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden border border-slate-100">
                    {user.avatar_url && <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />}
                  </div>
                  <span className="font-bold text-slate-800 text-sm">@{user.username}</span>
                </button>
              ))
            ) : searchQuery.includes('@') ? (
              <button onClick={handleAddEmail} className="w-full flex items-center gap-3 p-2.5 hover:bg-emerald-50 rounded-xl transition-colors text-left group">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors border border-emerald-200/50">
                  <Mail className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-emerald-800 text-sm leading-snug">Invite via Email</span>
                  <span className="text-[11px] text-emerald-600 font-medium">{searchQuery}</span>
                </div>
              </button>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm font-medium">
                {isSearching ? 'Searching...' : 'Type a username or email'}
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  )
}