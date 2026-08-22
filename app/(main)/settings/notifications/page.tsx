'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, SmilePlus, MessageCircle, Quote, UserPlus } from 'lucide-react'

type NotificationSettings = {
  notify_reactions: boolean
  notify_comments: boolean
  notify_quotes: boolean
  notify_followers: boolean
}

// 👇 FIXED: Moved the Custom Toggle Component OUTSIDE the main render function 👇
const Toggle = ({ enabled, onClick }: { enabled: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick} 
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shadow-inner ${enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
)

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/')
      
      setUserId(user.id)
      
      const { data } = await supabase
        .from('profiles')
        .select('notify_reactions, notify_comments, notify_quotes, notify_followers')
        .eq('id', user.id)
        .single()
      
      if (data) setSettings(data as NotificationSettings)
      setIsLoading(false)
    }
    fetchSettings()
  }, [supabase, router])

  const toggleSetting = async (key: keyof NotificationSettings) => {
    if (!settings || !userId) return
    
    // 1. Optimistic UI Update (Instant snap for the user)
    const newSettings = { ...settings, [key]: !settings[key] }
    setSettings(newSettings)

    // 2. Background Database Sync
    await supabase.from('profiles').update({ [key]: newSettings[key] }).eq('id', userId)
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center border-b border-slate-100 will-change-transform">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-black text-lg text-slate-800 ml-2">Notifications</h1>
      </header>

      <div className="p-4 sm:p-6 mt-2">
        <p className="text-sm font-bold text-slate-500 mb-4 px-2 tracking-wide">PUSH NOTIFICATIONS</p>
        
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          
          <div className="flex items-center justify-between p-5 border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50"><SmilePlus className="w-5 h-5 text-blue-500" /></div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">Reactions</span>
                <span className="text-xs font-medium text-slate-400">When someone reacts to your content</span>
              </div>
            </div>
            <Toggle enabled={settings?.notify_reactions ?? true} onClick={() => toggleSetting('notify_reactions')} />
          </div>

          <div className="flex items-center justify-between p-5 border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-50"><MessageCircle className="w-5 h-5 text-emerald-500" /></div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">Comments</span>
                <span className="text-xs font-medium text-slate-400">When users comment on your quotes</span>
              </div>
            </div>
            <Toggle enabled={settings?.notify_comments ?? true} onClick={() => toggleSetting('notify_comments')} />
          </div>

          <div className="flex items-center justify-between p-5 border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-50"><Quote className="w-5 h-5 text-purple-500" /></div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">Quoted In</span>
                <span className="text-xs font-medium text-slate-400">When someone quotes you</span>
              </div>
            </div>
            <Toggle enabled={settings?.notify_quotes ?? true} onClick={() => toggleSetting('notify_quotes')} />
          </div>

          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-50"><UserPlus className="w-5 h-5 text-amber-500" /></div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">New Followers</span>
                <span className="text-xs font-medium text-slate-400">When someone follows your profile</span>
              </div>
            </div>
            <Toggle enabled={settings?.notify_followers ?? true} onClick={() => toggleSetting('notify_followers')} />
          </div>

        </div>
      </div>
    </div>
  )
}