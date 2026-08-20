import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Home, PlusSquare, User, ShoppingCart, Trophy, Settings, LogOut } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Server-side Security & Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user.id)
    .maybeSingle() 

  if (!profile?.username) redirect('/setup')

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center font-sans selection:bg-black selection:text-white">
      
      {/* 
        MASTER GRID CONTAINER
        Mobile: 1 column
        Desktop (lg): 3 columns (Left Sidebar, Center Content, Right Sidebar)
      */}
      <div className="w-full max-w-350 flex flex-col lg:flex-row relative">
        
        {/* ========================================= */}
        {/* 📱 MOBILE TOP HEADER (Hidden on Desktop)  */}
        {/* ========================================= */}
        <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md pt-5 pb-3 px-6 flex justify-between items-center border-b border-slate-200/50 shadow-sm">
          <Link href="/feed">
            <Image src="/PinQuo_logo.png" alt="PinQuo Logo" width={110} height={35} priority className="h-8 w-auto object-contain" />
          </Link>
          <NotificationBell />
        </header>

        {/* ========================================= */}
        {/* 💻 LEFT SIDEBAR (Desktop Only)            */}
        {/* ========================================= */}
        <aside className="hidden lg:flex w-70 xl:w-[320px] flex-col sticky top-0 h-screen border-r border-slate-200/60 px-6 py-8 overflow-y-auto shrink-0 bg-white">
          <Link href="/feed" className="mb-10 pl-2 transition-transform hover:scale-105 active:scale-95">
            <Image src="/PinQuote-Logo.png" alt="PinQuo Logo" width={150} height={45} priority className="h-10 w-auto object-contain" />
          </Link>

          <nav className="flex flex-col gap-2 flex-1">
            <Link href="/feed" className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 transition-colors text-slate-800 hover:text-black group">
              <Home className="w-7 h-7 stroke-[2.5] group-hover:scale-110 transition-transform" />
              <span className="text-[19px] font-bold">Home</span>
            </Link>

            <Link href="/profile" className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 transition-colors text-slate-800 hover:text-black group">
              <User className="w-7 h-7 stroke-[2.5] group-hover:scale-110 transition-transform" />
              <span className="text-[19px] font-bold">Profile</span>
            </Link>

            {/* Inactive links mimicking your wireframe to fill out the UI */}
            <div className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400 cursor-not-allowed group" title="Coming Soon">
              <ShoppingCart className="w-7 h-7 stroke-[2.5]" />
              <span className="text-[19px] font-bold">Store</span>
            </div>
            
            <div className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400 cursor-not-allowed group" title="Coming Soon">
              <Trophy className="w-7 h-7 stroke-[2.5]" />
              <span className="text-[19px] font-bold">Tournament</span>
            </div>

            <div className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400 cursor-not-allowed group" title="Coming Soon">
              <Settings className="w-7 h-7 stroke-[2.5]" />
              <span className="text-[19px] font-bold">Settings</span>
            </div>
            
            {/* 🌟 Primary Action Button moved to Sidebar */}
            <Link href="/create" className="mt-6 flex items-center justify-center gap-2 bg-linear-to-r from-orange-400 to-pink-500 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:scale-95 px-6 py-4 rounded-full transition-all duration-200">
              <PlusSquare className="w-6 h-6 stroke-3" />
              <span className="text-xl font-black tracking-wide">Post Quote</span>
            </Link>
            <span className="text-l font-seriff text-red-600 tracking-wide">NOTE:</span>
            <span className="text-l font-seriff text-red-600 tracking-wide">Website RECONSTRUCTION. Some features are locked, some designs are ugly or placeholders and UX might not be what you expect.
            </span>
    
          </nav>

          <div className="mt-auto pt-6 text-sm font-bold text-slate-400 pl-4">
            <p>© 2026 PinQuo</p>
          </div>
        </aside>

        {/* ========================================= */}
        {/* 🎬 CENTER CONTENT COLUMN                  */}
        {/* ========================================= */}
        <main className="flex-1 max-w-2xl w-full mx-auto min-h-screen pb-32 lg:pb-10 lg:border-r border-slate-200/60 bg-white shadow-[0_0_40px_rgba(0,0,0,0.02)]">
          {children}
        </main>

        {/* ========================================= */}
        {/* 💻 RIGHT SIDEBAR (Desktop Only)           */}
        {/* ========================================= */}
        <aside className="hidden xl:flex w-75 flex-col sticky top-0 h-screen px-4 py-6 overflow-y-auto shrink-0">
          
          {/* User Profile & Notification Cluster */}
          <div className="flex items-center justify-end gap-3 mb-8 bg-white p-2 pr-3 rounded-full shadow-sm border border-slate-100">
            <Link href="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition cursor-pointer">
              <span className="font-bold text-slate-800 text-[14px]">{profile.username}</span>
              <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </Link>
            <div className="w-1px h-5 bg-slate-200 mx-1"></div>
            <NotificationBell />
          </div>

          {/* Sleeker Wireframe Widgets */}
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-black text-[15px] text-slate-800 mb-3 tracking-tight">Quote of the Day</h3>
              {/* Removed aspect-video, replaced with specific padding so it wraps the text tightly */}
              <div className="w-full bg-linear-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center p-5 shadow-inner">
                <p className="text-white font-serif italic text-sm text-center leading-snug">
                  "There are two ways to write error-free programs; only the third one works."
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-black text-[15px] text-slate-800 mb-3 tracking-tight">Trending Now</h3>
              <div className="w-full bg-linear-to-br from-orange-100 to-rose-100 rounded-xl flex items-center justify-center p-5 shadow-inner border border-orange-200/50">
                <p className="text-orange-950 font-serif italic text-sm text-center leading-snug">
                  "I wish I didnt sleep because I hate to wake up in the morning."
                </p>
              </div>
            </div>
          </div>
          
        </aside>

        {/* ========================================= */}
        {/* 📱 MOBILE BOTTOM NAV (Hidden on Desktop)  */}
        {/* ========================================= */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-100 flex items-center justify-around px-2 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <Link href="/feed" className="p-3 rounded-2xl hover:bg-slate-100 active:scale-95 transition">
            <Home className="w-7 h-7 text-black" />
          </Link>
          <Link href="/create" className="p-3 -mt-5 bg-black rounded-2xl hover:scale-105 active:scale-95 transition shadow-xl text-white">
            <PlusSquare className="w-7 h-7" />
          </Link>
          <Link href="/profile" className="p-3 rounded-2xl hover:bg-slate-100 active:scale-95 transition">
            <User className="w-7 h-7 text-black" />
          </Link>
        </nav>

      </div>
    </div>
  )
}