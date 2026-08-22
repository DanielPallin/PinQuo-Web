'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ShieldBan, User as UserIcon } from 'lucide-react'

type BlockedUser = {
  blocked_id: string
  blocked_profile: { username: string, avatar_url: string | null }
}

export default function BlocklistPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchBlocklist = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/')
      setCurrentUserId(user.id)

      // Joining the blocks table with profiles to get the username/avatar of the blocked person
      const { data } = await supabase
        .from('blocks')
        .select(`blocked_id, blocked_profile:profiles!blocks_blocked_id_fkey(username, avatar_url)`)
        .eq('blocker_id', user.id)

      if (data) setBlockedUsers(data as unknown as BlockedUser[])
      setIsLoading(false)
    }
    fetchBlocklist()
  }, [supabase, router])

  const handleUnblock = async (blockedId: string) => {
    if (!currentUserId) return
    
    // Optimistic UI remove
    setBlockedUsers(prev => prev.filter(u => u.blocked_id !== blockedId))
    
    // Database sync
    await supabase.from('blocks').delete().match({ blocker_id: currentUserId, blocked_id: blockedId })
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center border-b border-slate-100 will-change-transform">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-black text-lg text-slate-800 ml-2">Blocklist</h1>
      </header>

      <div className="p-4 sm:p-6 mt-2">
        {blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-[32px] border border-slate-100">
            <ShieldBan className="w-12 h-12 text-slate-200 mb-4" />
            <h2 className="font-bold text-slate-800 text-lg">No blocked users</h2>
            <p className="text-sm font-medium text-slate-400 mt-1">When you block someone, they will show up here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            {blockedUsers.map((user, idx) => (
              <div key={user.blocked_id} className={`flex items-center justify-between p-4 sm:p-5 ${idx !== blockedUsers.length -1 ? 'border-b border-slate-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                    {user.blocked_profile.avatar_url ? (
                      <img src={user.blocked_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <span className="font-bold text-slate-800">@{user.blocked_profile.username}</span>
                </div>
                <button 
                  onClick={() => handleUnblock(user.blocked_id)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-full transition-colors active:scale-95"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}