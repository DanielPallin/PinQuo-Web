'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, ChevronRight, LayoutTemplate, 
  Crown, Bell, ShieldBan, LogOut, Loader2 
} from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/')
      router.refresh()
    } else {
      console.error('Error logging out:', error)
      setIsLoggingOut(false)
    }
  }

  const menuItems = [
    { label: 'Manage Templates', icon: LayoutTemplate, href: '/templates/manage', color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Subscription', icon: Crown, href: '/settings/subscription', color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Notification Settings', icon: Bell, href: '/settings/notifications', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Blocklist', icon: ShieldBan, href: '/settings/blocklist', color: 'text-slate-500', bg: 'bg-slate-100' },
  ]

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-slate-50 pb-24">
      
      {/* App Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center border-b border-slate-100 will-change-transform">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-black text-lg text-slate-800 ml-2">Settings</h1>
      </header>

      <div className="p-4 sm:p-6 space-y-4 mt-2">
        
        {/* Core Settings Group */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <Link 
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 active:bg-slate-100 transition group ${
                  index !== menuItems.length - 1 ? 'border-b border-slate-50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.bg}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="font-bold text-slate-700 text-lg">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-transform group-hover:translate-x-1" />
              </Link>
            )
          })}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mt-6">
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-red-50 active:bg-red-100 transition group disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 group-hover:bg-red-100 transition-colors">
                {isLoggingOut ? (
                  <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                ) : (
                  <LogOut className="w-5 h-5 text-red-500 translate-x-[1px]" />
                )}
              </div>
              <span className="font-bold text-red-600 text-lg">
                {isLoggingOut ? 'Logging out...' : 'Log Out'}
              </span>
            </div>
          </button>
        </div>

      </div>
    </div>
  )
}