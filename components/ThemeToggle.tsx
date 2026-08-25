'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) return <div className="w-9 h-9 shrink-0" /> 

  return (
    <button 
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
      className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-yellow-400 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors active:scale-105 shrink-0"
      title="Toggle dark mode"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}