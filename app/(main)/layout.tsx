import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google'
import { Home, PlusSquare, User, Layers, ShoppingCart, Trophy, SettingsIcon, Award } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import SidebarWidgets from '@/components/SidebarWidgets'
import UpdatesWidget from '@/components/UpdatesWidget'
import ThemeToggle from '@/components/ThemeToggle'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let profile = null;

  // Only fetch the profile and enforce setup IF they are actually logged in
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .maybeSingle() 
    
    profile = data;

    // If they are logged in but have no username, force them to finish onboarding
    if (!profile?.username) {
      redirect('/setup')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex justify-center font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-200">
      
      <div className="w-full max-w-350 flex flex-col lg:flex-row relative">
        
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-white dark:bg-slate-950 md:bg-white/80 md:dark:bg-slate-950/80 md:backdrop-blur-md pt-5 pb-3 px-6 flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800 shadow-sm will-change-transform transition-colors duration-200">
          <Link href="/feed" className="dark:invert transition-all">
            <Image src="/PinQuote-Logo.png" alt="PinQuo Logo" width={110} height={35} priority className="h-8 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <UpdatesWidget />
            
            {/* PLG: Conditionally show Bell or Join button on mobile */}
            {profile ? (
              <NotificationBell />
            ) : (
              <Link href="/login" className="bg-black dark:bg-white text-white dark:text-black text-xs font-bold px-4 py-2 ml-1 rounded-full active:scale-95 transition-transform">
                Login
              </Link>
            )}
          </div>
        </header>
        

        {/* LEFT SIDEBAR (Desktop Only) */}
        <aside className="hidden lg:flex w-70 xl:w-[320px] flex-col sticky top-0 h-screen border-r border-slate-200/60 dark:border-slate-800 px-6 py-8 overflow-y-auto shrink-0 bg-white dark:bg-slate-950 transition-colors duration-200">
          <Link href="/feed" className="mb-10 pl-2 transition-transform hover:scale-105 active:scale-100">
            <Image src="/PinQuote-Logo.png" alt="PinQuo Logo" width={150} height={45} priority className="h-10 w-auto object-contain" />
          </Link>

          <nav className="flex flex-col gap-2 flex-1">
            <Link href="/feed" className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white group">
              <Home className="w-7 h-7 stroke-[2.5] group-hover:scale-110 transition-transform" />
              <span className="text-[19px] font-bold">Home</span>
            </Link>

            <Link href="/profile" className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white group">
              <User className="w-7 h-7 stroke-[2.5] group-hover:scale-110 transition-transform" />
              <span className="text-[19px] font-bold">Profile</span>
            </Link>

            <div className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500 cursor-not-allowed group" title="Coming Soon">
              <Award className="w-7 h-7 stroke-[2.5]" />
              <span className="text-[19px] font-bold">Achievements</span>
            </div>

            <Link href="/templates" className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white group">
              <Layers className="w-7 h-7 stroke-[2.5] group-hover:scale-110 transition-transform" />
              <span className="text-[19px] font-bold">Templates</span>
            </Link>

            <div className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500 cursor-not-allowed group" title="Coming Soon">
              <ShoppingCart className="w-7 h-7 stroke-[2.5]" />
              <span className="text-[19px] font-bold">Store</span>
            </div>
            
            <div className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500 cursor-not-allowed group" title="Coming Soon">
              <Trophy className="w-7 h-7 stroke-[2.5]" />
              <span className="text-[19px] font-bold">Tournament</span>
            </div>

            <Link href="/settings" className="flex items-center gap-4 px-4 py-3.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white group">
              <SettingsIcon className="w-7 h-7 stroke-[2.5] group-hover:scale-110 transition-transform" />
              <span className="text-[19px] font-bold">Settings</span>
            </Link>
            
            <Link 
              href="/create" 
              className="scale-90 mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-red-500 text-black shadow shadow-black hover:shadow-amber-950 hover:scale-98 active:scale-95 px-6 py-4 rounded-full transition-all duration-50"
            >
              <PlusSquare className="w-6 h-6 stroke-[4px] drop-shadow-md" />
              <span className="text-xl font-black tracking-wide">Post Quote</span>
            </Link>
          </nav>

          <div className="mt-auto pt-6 text-sm font-bold text-slate-800 dark:text-slate-500 pl-4 transition-colors">
            <p>© 2026 PinQuote</p>
          </div>
        </aside>

        {/* CENTER CONTENT COLUMN */}
        <main className="flex-1 max-w-2xl w-full mx-auto min-h-screen pb-32 lg:pb-10 lg:border-r border-slate-200/60 dark:border-slate-800 bg-white dark:bg-black shadow-[0_0_40px_rgba(0,0,0,0.02)] transition-colors duration-200">
          {children}
        </main>

        {/* RIGHT SIDEBAR (Desktop Only) */}
        <aside className="hidden xl:flex w-[320px] flex-col sticky top-0 h-screen px-4 pt-6 shrink-0 z-40">
          
          {/* User Profile & Notification Cluster */}
          {profile ? (
            <div className="relative z-50 flex items-center justify-between gap-1 mb-8 bg-white dark:bg-slate-800 p-2 pr-3 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 shrink-0 w-full transition-colors duration-200">
              
              <Link href="/profile" className="flex flex-1 min-w-0 items-center gap-2.5 hover:opacity-80 transition cursor-pointer pl-2">
                
                <div className="w-9 h-9 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center transition-colors">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
              </Link>
              
              <div className="w-[1px] h-5 bg-slate-200 dark:text-white dark:bg-slate-700 mx-1 shrink-0 transition-colors"></div>
          
              <div className="flex items-center shrink-0 dark:text-white dark:shadow-amber-50">
                <ThemeToggle />
                <UpdatesWidget />
                <NotificationBell />
              </div>
            </div>
          ) : (
            // PLG: Guest CTA for the Desktop Sidebar
            <div className="relative z-50 flex items-center justify-end gap-3 mb-8 shrink-0 w-full">
              <UpdatesWidget />
              <Link 
                href="/login" 
                className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold rounded-full hover:bg-slate-800 dark:hover:bg-slate-200 transition shadow-[0_4px_14px_rgba(0,0,0,0.1)] active:scale-95 text-sm"
              >
                Log In / Sign Up
              </Link>
            </div>
          )}

          {/* DYNAMIC WIDGETS */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-10 relative z-0">
            <SidebarWidgets />
          </div>
          
        </aside>

        {/* MOBILE BOTTOM NAV */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-950 md:bg-white/90 md:dark:bg-slate-950/90 md:backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 flex items-center justify-around px-2 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] will-change-transform transition-colors duration-200">
          <Link href="/feed" className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all group">
            <Home className="w-7 h-7 text-black dark:text-white transition-colors" />
          </Link>
          <Link href="/create" className="p-3 -mt-5 bg-black dark:bg-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl text-white dark:text-black group">
            <PlusSquare className="w-7 h-7 transition-colors" />
          </Link>
          <Link href="/profile" className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all group">
            <User className="w-7 h-7 text-black dark:text-white transition-colors" />
          </Link>
        </nav>

      </div>
    </div>
  )
}