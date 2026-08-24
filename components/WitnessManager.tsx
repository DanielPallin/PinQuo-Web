'use client'

import { useState, useEffect } from 'react'
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const maxWitnesses = 5
  const canAddMore = witnesses.length < maxWitnesses

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
    setIsModalOpen(false)
  }

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!canAddMore || !emailRegex.test(searchQuery) || witnesses.some(w => w.value === searchQuery)) return
    
    onChange([...witnesses, { type: 'email', value: searchQuery, display: searchQuery }])
    setSearchQuery('')
    setIsModalOpen(false)
  }

  const removeWitness = (valueToRemove: string) => {
    onChange(witnesses.filter(w => w.value !== valueToRemove))
  }

  return (
    <div className="flex flex-col gap-3 w-full my-4">
      
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
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
            <button onClick={() => removeWitness(witness.value)} className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Search Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-[24px] w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-7" />
              <form onSubmit={handleAddEmail} className="w-full">
                <input
                  type="text"
                  autoFocus
                  placeholder="Search username or enter email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-medium"
                />
              </form>
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2">
              {searchResults.length > 0 ? (
                searchResults.map(user => (
                  <button key={user.id} onClick={() => handleAddUser(user)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                      {user.avatar_url && <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />}
                    </div>
                    <span className="font-bold text-slate-800">@{user.username}</span>
                  </button>
                ))
              ) : searchQuery.includes('@') ? (
                <button onClick={handleAddEmail} className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 rounded-xl transition-colors text-left group">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                    <Mail className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-emerald-800">Invite via Email</span>
                    <span className="text-xs text-emerald-600 font-medium">{searchQuery}</span>
                  </div>
                </button>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm font-medium">
                  {isSearching ? 'Searching...' : 'Type a username or email'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}