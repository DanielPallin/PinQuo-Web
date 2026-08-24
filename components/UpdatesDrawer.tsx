'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Rocket, Hammer } from 'lucide-react'

interface UpdatesDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function UpdatesDrawer({ isOpen, onClose }: UpdatesDrawerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => { 
      document.body.style.overflow = 'unset' 
    }
  }, [isOpen])

  // Don't render anything if closed or if SSR is still running
  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Drawer Panel */}
      <div className="relative w-full sm:w-[400px] h-[100dvh] bg-white shadow-2xl flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-right-full duration-300 border-l border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 shrink-0 bg-white/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
              <Rocket className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 leading-tight">What's New</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">PinQuo Changelog</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-10 no-scrollbar pb-24">
          
          {/* SECTION: Live Now */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Rocket className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Live Now</h3>
            </div>

            {/* Timeline Line */}
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-200 before:via-slate-200 before:to-transparent">
              
              {/* Update Item 1 */}
              <div className="relative flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border-4 border-emerald-500 shrink-0 relative z-10 shadow-sm mt-0.5"></div>
                <div className="flex flex-col gap-1.5 pb-2">
                  <span className="text-xs font-black text-emerald-600 tracking-wide uppercase">Just Shipped</span>
                  <h4 className="text-lg font-black text-slate-800 leading-tight">Camera Snap</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Capture the moment when the quote was said.
                  </p>
                </div>
              </div>

              {/* Update Item 2 */}
              <div className="relative flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border-4 border-emerald-500 shrink-0 relative z-10 shadow-sm mt-0.5"></div>
                <div className="flex flex-col gap-1.5 pb-2">
                  <span className="text-xs font-black text-emerald-600 tracking-wide uppercase">Live</span>
                  <h4 className="text-lg font-black text-slate-800 leading-tight">The Witness Update 🕵️</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Quotes just got serious. You can now tag witnesses to verify or deny your quotes. This can be fun.
                  </p>
                </div>
              </div>

              {/* Update Item 3 */}
              <div className="relative flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-slate-50 border-4 border-green-500 shrink-0 relative z-10 mt-0.5"></div>
                <div className="flex flex-col gap-1.5 pb-2">
                  <span className="text-xs font-bold text-green-700 tracking-wide uppercase">Live</span>
                  <h4 className="text-lg font-black text-slate-800 leading-tight">Template Vault</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Massive overhaul to the template system. Introduced Favourite-system, Packs and a Trending section to help you manage and find the perfect vibe faster.
                  </p>
                </div>
              </div>

            </div>
          </section>

          {/* Divider */}
          <div className="h-px w-full bg-slate-100"></div>

          {/* SECTION: In The Pipeline */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Hammer className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">In The Pipeline</h3>
            </div>

            <div className="flex flex-col gap-3">

                {/* Use this for Work in progress: <div className="w-2.5 h-2.5 rounded-full bg-blue-700 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div> }

                {/* Pipeline Item 1 */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 flex gap-4">
                <div className="mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-700 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Dark Mode 🌙</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">Ofc there is a Dark Mode in the Pipeline for all you night-owls out there.</p>
                </div>
              </div>

              {/* Pipeline Item 2 */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 flex gap-4">
                <div className="mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Achivements ⭐</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">Let you browse, hunt and collect Achievements.</p>
                </div>
              </div>

              {/* Pipeline Item 3 */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 flex gap-4">
                <div className="mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Tournaments Mode 🏆</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">Global quote battles. The best quote in a specific setting or category wins & the publisher gets rewarded.</p>
                </div>
              </div>

            </div>
          </section>

        </div>
        
        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 mt-auto shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-[10px] font-black text-center text-slate-400 uppercase tracking-widest">
            PinQuo v1.2
          </p>
        </div>

      </div>
    </div>,
    document.body
  )
}