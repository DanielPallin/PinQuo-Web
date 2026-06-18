'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, UserPlus, User, CheckCircle2, MessageCircle, SmilePlus, Quote } from 'lucide-react'
import { type RealtimeChannel } from '@supabase/supabase-js'
import Link from 'next/link'

type Notification = {
  id: string
  type: string
  is_read: boolean
  created_at: string
  quote_id: string | null
  actor: { username: string, avatar_url: string | null }
}

const timeAgo = (dateString: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default function NotificationBell() {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true
    let subscription: RealtimeChannel

    const loadNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select(`
          id, type, is_read, created_at, quote_id,
          actor:profiles!notifications_actor_id_fkey(username, avatar_url)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data && isMounted) {
        const parsedData = data as unknown as Notification[]
        setNotifications(parsedData)
        setUnreadCount(parsedData.filter(n => !n.is_read).length)
      }
    }

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      subscription = supabase
        .channel(`realtime-notifications-${Date.now()}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `receiver_id=eq.${user.id}`
        }, () => {
          loadNotifications().catch(console.error)
        })
        .subscribe()
    }

    loadNotifications().catch(console.error)
    setupRealtime().catch(console.error)

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      isMounted = false
      if (subscription) {
        supabase.removeChannel(subscription).catch(console.error)
      }
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [supabase])

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('notifications').update({ is_read: true }).eq('receiver_id', user.id).eq('is_read', false)
    setUnreadCount(0)
    setNotifications(notifications.map(n => ({ ...n, is_read: true })))
  }

  // Handle Marking Individual Notifications as Read on Click
  const handleNotificationClick = async (notifId: string) => {
    setIsOpen(false)
    const notif = notifications.find(n => n.id === notifId)
    if (!notif || notif.is_read) return

    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notifId).eq('receiver_id', user.id)
    }
  }

  // DYNAMIC ROUTING HELPER
  const getActionLink = (notif: Notification) => {
    if (notif.type === 'follow') return `/${notif.actor.username}`
    if (notif.quote_id) return `/feed?quoteId=${notif.quote_id}`
    return '#'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors cursor-pointer ${isOpen ? 'bg-slate-200' : 'hover:bg-slate-200'}`}
      >
        <Bell className="w-8 h-8 text-black" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-in zoom-in"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
          
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-black text-lg text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-emerald-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-1 transition cursor-pointer">
                <CheckCircle2 className="w-4 h-4" /> Mark read
              </button>
            )}
          </div>

          <div className="flex flex-col max-h-[400px] overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-bold">Up to date!</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`flex items-start gap-4 p-4 transition hover:bg-slate-50 border-b border-slate-50 last:border-0 ${!notif.is_read ? 'bg-emerald-50/30' : ''}`}>
                  
                  {/* AVATAR CLICK -> Goes to Profile */}
                  <Link 
                    href={`/${notif.actor.username}`}
                    onClick={() => handleNotificationClick(notif.id)}
                    className="w-12 h-12 rounded-full bg-slate-200 shrink-0 flex items-center justify-center overflow-hidden border border-slate-200 hover:ring-2 hover:ring-slate-200 transition-all cursor-pointer"
                  >
                    {notif.actor.avatar_url ? (
                      <img src={notif.actor.avatar_url} alt="Avatar" crossOrigin="anonymous" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </Link>

                  <div className="flex-1 flex flex-col justify-center pt-1">
                    <p className="text-sm text-slate-700 leading-snug">
                      
                      {/* USERNAME CLICK -> Goes to Profile */}
                      <Link 
                        href={`/${notif.actor.username}`}
                        onClick={() => handleNotificationClick(notif.id)}
                        className="font-bold text-black hover:underline mr-1 cursor-pointer"
                      >
                        {notif.actor.username}
                      </Link>
                      
                      {/* ACTION TEXT CLICK -> Goes exactly to the Quote Modal or Profile */}
                      <Link 
                        href={getActionLink(notif)}
                        onClick={() => handleNotificationClick(notif.id)}
                        className="hover:text-black hover:underline transition-colors cursor-pointer"
                      >
                        {notif.type === 'follow' && 'started following you.'}
                        {notif.type === 'reaction' && 'reacted to your quote.'}
                        {notif.type === 'comment' && 'commented on your quote.'}
                        {notif.type === 'quote' && 'quoted you in a post.'}
                      </Link>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {notif.type === 'follow' && <UserPlus className="w-3.5 h-3.5 text-blue-500" />}
                      {notif.type === 'reaction' && <SmilePlus className="w-3.5 h-3.5 text-pink-500" />}
                      {notif.type === 'comment' && <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />}
                      {notif.type === 'quote' && <Quote className="w-3.5 h-3.5 text-indigo-500" />}
                      
                      <span className="text-xs font-bold text-slate-400">{timeAgo(notif.created_at)}</span>
                    </div>
                  </div>

                  {!notif.is_read && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-3 shrink-0"></div>}

                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}