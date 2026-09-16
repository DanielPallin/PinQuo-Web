'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { User } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import UpdatesWidget from '@/components/UpdatesWidget'
import NotificationBell from '@/components/NotificationBell'

export default function FloatingUserPill() {
  const [user, setUser] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // 1. Initial Fetch
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single()
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)
      }
    }
    fetchUser()

    // 2. Real-time Auth Listener (Instantly updates when a guest logs in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
        setAvatarUrl(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <div className="flex w-max ml-auto items-center gap-1 sm:gap-2 bg-slate-900/95 dark:bg-slate-950/90 backdrop-blur-md border border-slate-800 dark:border-slate-800/80 rounded-full px-3 py-2 shadow-sm animate-in fade-in duration-300">
      
      {/* 1. Auth / Avatar */}
      {user ? (
        <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 hover:scale-105 transition-transform shrink-0 ml-1">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-400"/>
            </div>
          )}
        </Link>
      ) : (
        <Link href="/login" className="text-sm font-bold text-white hover:text-emerald-400 transition-colors px-3 py-1">
          Log In
        </Link>
      )}

      {/* 2. Vertical Divider */}
      <div className="w-[1px] h-5 bg-slate-700 mx-1 "></div>

      {/* 3. Global Tools (Visible to Everyone) */}
      <ThemeToggle />
      <UpdatesWidget />

      {/* 4. Notifications (Logged in Only) */}
      {user && (
        <NotificationBell />
      )}

    </div>
  )
}