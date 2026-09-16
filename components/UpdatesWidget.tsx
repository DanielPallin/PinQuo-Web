'use client'

import { useState } from 'react'
import { Rocket } from 'lucide-react'
import UpdatesDrawer from '@/components/UpdatesDrawer'

export default function UpdatesWidget() {
  const [showUpdates, setShowUpdates] = useState(false)

  return (
    <>
      <button 
        onClick={() => setShowUpdates(true)} 
        className="relative p-2.5 sm:p-3 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-400 rounded-full transition-all group active:scale-95"
        title="What's New"
      >
        <Rocket className="w-5 h-5 sm:w-6 sm:h-6 group-active:scale-95 transition-transform" />
        {/* Live Ping Dot */}
        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950 group-hover:border-emerald-50 transition-colors"></span>
      </button>

      <UpdatesDrawer isOpen={showUpdates} onClose={() => setShowUpdates(false)} />
    </>
  )
}