'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FeedQuote, GroupedReaction } from '@/components/QuoteCard'
import { Trophy, Flame } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

type RawQuoteData = {
  id: string
  content: string
  created_at: string
  live_photo_url: string | null
  quoted_email: string | null
  custom_author_name: string | null
  publisher: { id: string, username: string, avatar_url: string | null } | null
  quoted_user: { id: string, username: string, avatar_url: string | null } | null
  template: { style_config: { gradient?: string, baseColor?: string }, image_url: string | null } | null
  reactions: { reaction_type: string, user_id: string, comment_id: string | null }[] | null
  favorites: { user_id: string }[] | null
  comments: { count: number }[] | null
}

const formatQuote = (q: RawQuoteData, userId: string | null): FeedQuote & { score: number } => {
  const quoteReacts = (q.reactions || []).filter(r => r.comment_id === null)
  const reactMap: Record<string, GroupedReaction> = {}
  
  quoteReacts.forEach((r) => {
    if (!reactMap[r.reaction_type]) reactMap[r.reaction_type] = { emoji: r.reaction_type, count: 0, hasReacted: false }
    reactMap[r.reaction_type].count++
    if (userId && r.user_id === userId) reactMap[r.reaction_type].hasReacted = true
  })

  const commentCount = q.comments?.[0]?.count || 0
  const reactionCount = quoteReacts.length
  
  return {
    id: q.id,
    content: q.content,
    created_at: q.created_at,
    live_photo_url: q.live_photo_url,
    quoted_email: q.quoted_email,
    custom_author_name: q.custom_author_name,
    publisher: q.publisher,
    quoted_user: q.quoted_user,
    template: q.template,
    groupedReactions: Object.values(reactMap).sort((a, b) => b.count - a.count),
    commentCount,
    favoriteCount: (q.favorites || []).length,
    isFavorited: userId ? (q.favorites || []).some((f) => f.user_id === userId) : false,
    score: reactionCount + commentCount
  }
}

export default function SidebarWidgets() {
  const supabase = createClient()
  const router = useRouter()
  
  const [quoteOfTheDay, setQuoteOfTheDay] = useState<(FeedQuote & { score: number }) | null>(null)
  const [quoteOfTheWeek, setQuoteOfTheWeek] = useState<(FeedQuote & { score: number }) | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchTopQuotes = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || null

      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      
      const day = now.getDay()
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(now.setDate(diffToMonday))
      monday.setHours(0, 0, 0, 0)
      const mondayIso = monday.toISOString()

      const { data } = await supabase
        .from('quotes')
        .select(`
          id, content, created_at, quoted_email, custom_author_name,
          live_photo_url,
          publisher:profiles!quotes_publisher_id_fkey(id, username, avatar_url),
          quoted_user:profiles!quotes_quoted_user_id_fkey(id, username, avatar_url),
          template:templates(style_config, image_url),
          reactions(reaction_type, user_id, comment_id),
          favorites(user_id),
          comments(count)
        `)
        .gte('created_at', mondayIso)
        .order('created_at', { ascending: false })

      if (data && isMounted) {
        const formatted = (data as unknown as RawQuoteData[]).map(q => formatQuote(q, userId))

        const dayCandidates = formatted.filter(q => q.created_at >= twentyFourHoursAgo).sort((a, b) => b.score - a.score)
        setQuoteOfTheDay(dayCandidates.length > 0 ? dayCandidates[0] : [...formatted].sort((a, b) => b.score - a.score)[0] || null)

        const weekCandidates = [...formatted].sort((a, b) => b.score - a.score)
        setQuoteOfTheWeek(weekCandidates.length > 0 ? weekCandidates[0] : null)
      }
      if (isMounted) setIsLoading(false)
    }

    void fetchTopQuotes()
    return () => { isMounted = false }
  }, [supabase])

  const renderMiniCard = (quote: FeedQuote) => {
    const cleanQuoteContent = quote.content.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim()
    const targetName = quote.custom_author_name || quote.quoted_user?.username || (quote.quoted_email ? 'Pending Invite' : 'Unknown')

    return (
      <div 
        onClick={() => router.push(`/feed?quoteId=${quote.id}`, { scroll: false })}
        className="w-full bg-slate-900 rounded-2xl p-5 relative overflow-hidden cursor-pointer group shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform aspect-square flex flex-col items-center justify-center text-center"
      >
        {/* Waterfall */}
        {quote.live_photo_url ? (
          <img src={quote.live_photo_url} alt="Live Snap" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-70 transition-opacity" />
        ) : quote.template?.image_url ? (
          <img src={quote.template.image_url} alt="" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-70 transition-opacity" style={{ filter: 'contrast(1.15) saturate(1.2) sepia(0.15) brightness(0.8)' }} />
        ) : (
          <div className={`absolute inset-0 bg-linear-to-br ${quote.template?.style_config?.gradient || 'from-slate-800 to-slate-900'}`}></div>
        )}

        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>
        
        <div className="relative inline-block max-w-[85%] mx-auto z-10 mt-2">
          <span className="absolute top-0 left-0 -translate-x-[110%] -translate-y-[40%] text-3xl font-serif font-black text-white/50 drop-shadow-md leading-none pointer-events-none select-none">&ldquo;</span>
          <p className="font-black text-white text-[15px] sm:text-base leading-snug whitespace-pre-wrap line-clamp-4" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
            {cleanQuoteContent}
          </p>
          <span className="absolute bottom-0 right-0 translate-x-[110%] translate-y-[30%] text-3xl font-serif font-black text-white/50 drop-shadow-md leading-none pointer-events-none select-none">&rdquo;</span>
        </div>
        <span className="relative z-10 text-white/90 font-bold text-xs mt-4 tracking-wide" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
          &mdash; {targetName}
        </span>
      </div>
    )
  }

  if (isLoading) return (
    <div className="flex flex-col gap-6 w-full max-w-xs">
      <div className="bg-white rounded-[32px] p-5 border border-slate-100 flex flex-col h-64 animate-pulse"><div className="h-4 w-32 bg-slate-200 rounded-full mb-3"></div><div className="w-full flex-1 bg-slate-100 rounded-2xl"></div></div>
      <div className="bg-white rounded-[32px] p-5 border border-slate-100 flex flex-col h-64 animate-pulse"><div className="h-4 w-32 bg-slate-200 rounded-full mb-3"></div><div className="w-full flex-1 bg-slate-100 rounded-2xl"></div></div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 w-full max-w-xs">
      <div className="bg-white rounded-[32px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Trophy className="w-4 h-4 text-amber-500 fill-amber-500 drop-shadow-sm" />
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Quote of the Day</h3>
        </div>
        {quoteOfTheDay ? renderMiniCard(quoteOfTheDay) : <div className="h-32 flex items-center justify-center text-xs font-bold text-slate-400">No quotes yet today.</div>}
      </div>

      <div className="bg-white rounded-[32px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Flame className="w-4 h-4 text-orange-500 fill-orange-500 drop-shadow-sm" />
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Trending</h3>
        </div>
        {quoteOfTheWeek ? renderMiniCard(quoteOfTheWeek) : <div className="h-32 flex items-center justify-center text-xs font-bold text-slate-400">No quotes yet this week.</div>}
      </div>
    </div>
  )
}