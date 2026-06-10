import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, PlusSquare, User } from 'lucide-react'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle() 

  if (!profile?.username) redirect('/setup')

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-2xl bg-white min-h-screen relative flex flex-col shadow-2xl">
        
        <main className="flex-1 pb-40">
          {children}
        </main>

        <nav className="fixed bottom-0 w-full max-w-2xl bg-white border-t border-slate-100 flex items-center justify-between px-4 py-5 z-50 rounded-t-[36px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          
          <Link 
            href="/feed" 
            className="flex-1 flex items-center justify-center gap-3 bg-slate-50 border border-slate-200/50 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.06)] active:translate-y-0 active:scale-95 mx-2 py-4 rounded-3xl transition-all duration-200"
          >
            <Home className="w-9 h-9 stroke-[2.5] text-black" />
            <span className="hidden md:block font-bold text-black text-base tracking-wide">
              Feed
            </span>
          </Link>

          <Link 
            href="/create" 
            className="flex-1 flex items-center justify-center gap-3 bg-slate-50 border border-slate-200/50 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.06)] active:translate-y-0 active:scale-95 mx-2 py-4 rounded-3xl transition-all duration-200"
          >
            <PlusSquare className="w-9 h-9 stroke-[2.5] text-black" />
            <span className="hidden md:block font-bold text-black text-base tracking-wide">
              Create
            </span>
          </Link>

          <Link 
            href="/profile" 
            className="flex-1 flex items-center justify-center gap-3 bg-slate-50 border border-slate-200/50 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.06)] active:translate-y-0 active:scale-95 mx-2 py-4 rounded-3xl transition-all duration-200"
          >
            <User className="w-9 h-9 stroke-[2.5] text-black" />
            <span className="hidden md:block font-bold text-black text-base tracking-wide">
              Profile
            </span>
          </Link>

        </nav>
      </div>
    </div>
  )
}