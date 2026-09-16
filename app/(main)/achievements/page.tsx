'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Trophy, Lock, CheckCircle2, User, Camera, Mail, ShieldAlert, ShieldCheck, MessageSquare, Heart, Quote, Users, PenTool } from 'lucide-react'

// --- 1. LADDER GENERATOR ---
const LADDER_STEPS = [1, 5, 10, 25, 50, 100, 1000, 10000]

const generateLadder = (metric: string, dateDictKey: string, titlePrefix: string, desc: string, icon: any) => {
  return LADDER_STEPS.map((step, index) => ({
    id: `${metric}_${step}`,
    title: `${titlePrefix} ${index + 1}`,
    description: `${desc} ${step} ${step === 1 ? 'time' : 'times'}.`,
    metric: metric,
    dateDictKey: dateDictKey,
    target: step,
    icon: icon,
  }))
}

// --- 2. ACHIEVEMENT DICTIONARY ---
const ACHIEVEMENTS_CATALOG = [
  // One-Offs (Using specific date fields where available)
  { id: 'avatar', title: 'Working on my likeability', description: 'Upload a profile avatar.', metric: 'has_avatar', exactDateField: null, target: 1, icon: User },
  { id: 'live_snap', title: 'Say Cheese!', description: 'Post a quote using a Live Snap.', metric: 'has_live_snap', exactDateField: 'live_snap_date', target: 1, icon: Camera },
  { id: 'invite', title: 'The Recruiter', description: 'Invite a friend by tagging their email in a post.', metric: 'has_tagged_email', exactDateField: 'tagged_email_date', target: 1, icon: Mail },
  { id: 'liar', title: 'LIAR!', description: 'Have at least 2 witnesses deny a single quote.', metric: 'has_disapproved', exactDateField: null, target: 1, icon: ShieldAlert },
  { id: 'truthteller', title: 'Truthteller', description: 'Have at least 2 witnesses approve a single quote.', metric: 'has_approved', exactDateField: null, target: 1, icon: ShieldCheck },
  
  // Ladders
  ...generateLadder('quotes_count', 'quote_dates', 'Publisher Lvl', 'Post', PenTool),
  ...generateLadder('followers_count', 'follower_dates', 'Influencer Lvl', 'Gain', Users),
  ...generateLadder('comments_count', 'comment_dates', 'Critic Lvl', 'Leave comments on unique publications', MessageSquare),
  ...generateLadder('reactions_count', 'reaction_dates', 'Vibe Checker Lvl', 'React to unique publications', Heart),
  ...generateLadder('quoted_me_count', 'quoted_me_dates', 'Muse Lvl', 'Get quoted', Quote),
]

export default function AchievementsPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase.rpc('get_user_gamification_stats', { target_user_id: session.user.id })
      
      if (!error && data) {
        setStats(data as Record<string, any>)
      }
      setIsLoading(false)
    }

    fetchStats()
  }, [supabase, router])

  // Process, Filter, and Sort
  const visibleAchievements = useMemo(() => {
    if (!stats) return []
    
    const visible: any[] = []
    const metricGroups: Record<string, any[]> = {}

    // Group by metric
    ACHIEVEMENTS_CATALOG.forEach(ach => {
      if (!metricGroups[ach.metric]) metricGroups[ach.metric] = []
      metricGroups[ach.metric].push(ach)
    })

    // Filter ladders (show unlocked + next locked)
    Object.values(metricGroups).forEach(group => {
      let foundNextLocked = false
      group.sort((a, b) => a.target - b.target).forEach(ach => {
        const currentValue = stats[ach.metric] || 0
        const isUnlocked = currentValue >= ach.target
        
        // Fetch exact date from dictionary or exact field
        let earnedDate = null
        if (isUnlocked) {
          if (ach.dateDictKey && stats[ach.dateDictKey]) {
            // e.g., looks up "5" inside quote_dates
            earnedDate = stats[ach.dateDictKey][ach.target.toString()] 
          } else if (ach.exactDateField) {
            earnedDate = stats[ach.exactDateField]
          }
        }

        if (isUnlocked) {
          visible.push({ ...ach, currentValue, isUnlocked, earnedDate })
        } else if (!foundNextLocked) {
          visible.push({ ...ach, currentValue, isUnlocked, earnedDate: null })
          foundNextLocked = true 
        }
      })
    })

    // SORTING LOGIC: Completed First -> Highest Progress -> Lowest Progress -> Alphabetical
    return visible.sort((a, b) => {
      // 1. Unlocked always come before Locked
      if (a.isUnlocked && !b.isUnlocked) return -1
      if (!a.isUnlocked && b.isUnlocked) return 1
      
      // 2. If both are in the same state, sort by progress percentage (descending)
      const pctA = Math.min(1, a.currentValue / a.target)
      const pctB = Math.min(1, b.currentValue / b.target)
      
      if (pctA !== pctB) return pctB - pctA 

      // 3. Fallback tie-breaker
      return a.title.localeCompare(b.title)
    })
  }, [stats])

  if (isLoading) return <div className="flex min-h-screen items-center justify-center dark:bg-black bg-white"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>

  const unlockedCount = visibleAchievements.filter(a => a.isUnlocked).length
  const totalCount = ACHIEVEMENTS_CATALOG.length

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto min-h-screen bg-white dark:bg-black pb-24 pt-8 px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-700/50">
          <Trophy className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-black text-amber-600 dark:text-amber-400 mb-2">Achievements</h1>
        <p className="text-black dark:text-white font-medium">
          You have unlocked <strong className="text-amber-500">{unlockedCount}</strong>/{totalCount} achievements.
        </p>
        <p className="text-black dark:text-white font-medium">
            Unlock more to view hidden achievements.
        </p>
      </div>

      {/* 3-Card Horizontal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleAchievements.map((ach) => {
          const Icon = ach.icon
          const progressPercent = Math.min(100, Math.round((ach.currentValue / ach.target) * 100))
          
          // Format the date if it exists
          const formattedDate = ach.earnedDate 
            ? new Date(ach.earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Recently'

          return (
            <div 
              key={ach.id} 
              className={`relative flex flex-col p-6 rounded-[28px] border transition-all ${
                ach.isUnlocked 
                  ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/50 shadow-md' 
                  : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-800/80 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  ach.isUnlocked 
                    ? 'bg-emerald-100 dark:bg-black dark:border-amber-800 dark:border-2 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-slate-200 dark:bg-slate-400 text-slate-400 dark:text-white'
                }`}>
                  <Icon className="w-6 dark:text-amber-800 h-6" />
                </div>
                
                {ach.isUnlocked ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <Lock className="w-5 h-5 text-slate-300 dark:text-red-500 " />
                )}
              </div>

              <h3 className={`font-black text-lg mb-1.5 ${ach.isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                {ach.title}
              </h3>
              <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 leading-snug mb-6 flex-1">
                {ach.description}
              </p>

              {/* Footer: Progress Bar OR Earned Date */}
              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/60">
                {ach.isUnlocked ? (
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                    <span className="text-emerald-600 dark:text-emerald-500">Completed</span>
                    <span className="text-slate-400 text-right">
                      {formattedDate === 'Recently' ? 'Recently' : `Earned ${formattedDate}`}
                    </span>
                  </div>
                ) : (
                  ach.target > 1 && (
                    <>
                      <div className="flex justify-between text-xs font-bold mb-2.5">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {Math.min(ach.currentValue, ach.target)} / {ach.target}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out bg-amber-400 dark:bg-amber-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </>
                  )
                )}
              </div>
              
            </div>
          )
        })}
      </div>

    </div>
  )
}