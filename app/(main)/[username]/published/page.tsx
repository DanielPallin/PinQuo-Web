'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Crown, User, Loader2, X, Star } from 'lucide-react'
import Link from 'next/link'

const getQuoteFontSize = (text: string) => {
  const len = text.length
  if (len < 40) return 'text-4xl md:text-5xl'
  if (len < 80) return 'text-3xl md:text-4xl'
  if (len < 140) return 'text-2xl md:text-3xl'
  if (len < 200) return 'text-xl md:text-2xl'
  return 'text-lg md:text-xl'
}

type Profile = { id: string; username: string; avatar_url: string | null }
type RawReaction = { reaction_type: string, user_id: string }
type RawFavorite = { user_id: string }

type RawQuoteData = {
  id: string
  content: string
  created_at: string
  quoted_email: string | null
  publisher: { username: string } | null
  quoted_user: { username: string } | null
  template: { style_config: { gradient: string, baseColor: string } } | null
  reactions: RawReaction[] | null
  favorites: RawFavorite[] | null
}

type FeedQuote = {
  id: string
  content: string
  created_at: string
  quoted_email: string | null
  publisher: { username: string } | null
  quoted_user: { username: string } | null
  template: { style_config: { gradient: string, baseColor: string } } | null
  reactionCounts: { fire: number, heart: number, hundred: number }
  userReactions: { fire: boolean, heart: boolean, hundred: boolean }
  favoriteCount: number
  isFavorited: boolean
}

export default function PublishedPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  
  const usernameParam = typeof params?.username === 'string' ? decodeURIComponent(params.username) : ''

  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null)
  const [quotes, setQuotes] = useState<FeedQuote[]>([])
  const [expandedQuote, setExpandedQuote] = useState<FeedQuote | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchGrid = async () => {
      if (!usernameParam) return

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user && isMounted) setCurrentUser({ id: user.id })

      // Fetch the target profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', usernameParam)
        .single()

      if (profileError || !profileData) {
        if (isMounted) { setIsNotFound(true); setIsLoading(false); }
        return
      }

      if (isMounted) setTargetProfile(profileData)

      // Fetch Published Quotes for this user
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          id, content, created_at, quoted_email,
          publisher:profiles!quotes_publisher_id_fkey(username),
          quoted_user:profiles!quotes_quoted_user_id_fkey(username),
          template:templates(style_config),
          reactions(reaction_type, user_id),
          favorites(user_id)
        `)
        .eq('publisher_id', profileData.id)
        .order('created_at', { ascending: false })

      if (data && isMounted) {
        const rawData = data as unknown as RawQuoteData[]
        const formattedQuotes: FeedQuote[] = rawData.map((q) => {
          const rawReactions = q.reactions || []
          const rawFavorites = q.favorites || []
          const counts = { fire: 0, heart: 0, hundred: 0 }
          const uReacts = { fire: false, heart: false, hundred: false }

          rawReactions.forEach((r) => {
            if (r.reaction_type === 'fire') counts.fire++
            if (r.reaction_type === 'heart') counts.heart++
            if (r.reaction_type === '100') counts.hundred++
            if (user && r.user_id === user.id) {
              if (r.reaction_type === 'fire') uReacts.fire = true
              if (r.reaction_type === 'heart') uReacts.heart = true
              if (r.reaction_type === '100') uReacts.hundred = true
            }
          })

          return {
            ...q,
            reactionCounts: counts,
            userReactions: uReacts,
            favoriteCount: rawFavorites.length,
            isFavorited: user ? rawFavorites.some((f) => f.user_id === user.id) : false
          }
        })

        setQuotes(formattedQuotes)
      } else if (error) {
        console.error("Error fetching quotes:", error)
      }
      if (isMounted) setIsLoading(false)
    }

    void fetchGrid()
    return () => { isMounted = false }
  }, [supabase, usernameParam])

  // Interactive Social Actions as Feed
  const toggleReaction = async (quoteId: string, type: 'fire' | 'heart' | 'hundred') => {
    if (!currentUser) return
    const dbType = type === 'hundred' ? '100' : type
    const quote = quotes.find((q) => q.id === quoteId)
    if (!quote) return
    const isAdding = !quote.userReactions[type]

    // Update main grid state
    const updateQuote = (q: FeedQuote) => ({
      ...q,
      reactionCounts: { ...q.reactionCounts, [type]: q.reactionCounts[type] + (isAdding ? 1 : -1) },
      userReactions: { ...q.userReactions, [type]: isAdding }
    })
    
    setQuotes((prev) => prev.map((q) => q.id === quoteId ? updateQuote(q) : q))
    if (expandedQuote?.id === quoteId) setExpandedQuote(updateQuote(expandedQuote))

    if (isAdding) await supabase.from('reactions').insert({ quote_id: quoteId, user_id: currentUser.id, reaction_type: dbType })
    else await supabase.from('reactions').delete().match({ quote_id: quoteId, user_id: currentUser.id, reaction_type: dbType })
  }

  const toggleFavorite = async (quoteId: string) => {
    if (!currentUser) return
    const quote = quotes.find((q) => q.id === quoteId)
    if (!quote) return
    const isAdding = !quote.isFavorited

    const updateQuote = (q: FeedQuote) => ({ ...q, favoriteCount: q.favoriteCount + (isAdding ? 1 : -1), isFavorited: isAdding })
    
    setQuotes((prev) => prev.map((q) => q.id === quoteId ? updateQuote(q) : q))
    if (expandedQuote?.id === quoteId) setExpandedQuote(updateQuote(expandedQuote))

    if (isAdding) await supabase.from('favorites').insert({ quote_id: quoteId, user_id: currentUser.id })
    else await supabase.from('favorites').delete().match({ quote_id: quoteId, user_id: currentUser.id })
  }

  const renderModalCard = (quote: FeedQuote) => {
    const publisherName = quote.publisher?.username || 'Unknown'
    const targetName = quote.quoted_user?.username || quote.quoted_email || 'Unknown'
    const displayHandle = `@${targetName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    const bgGradient = quote.template?.style_config?.gradient || 'from-indigo-500 to-purple-600'

    return (
      <div className="w-full flex flex-col bg-white rounded-[40px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        
        <div className="flex items-center gap-3 mb-5 px-2">
          <Link href={`/${publisherName}`} onClick={() => setExpandedQuote(null)} className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 hover:ring-2 hover:ring-slate-200 transition-all">
            <User className="w-6 h-6 text-slate-400" />
          </Link>
          <p className="text-slate-500 font-medium text-sm">
            Published by <Link href={`/${publisherName}`} onClick={() => setExpandedQuote(null)} className="font-bold text-slate-800 hover:text-black hover:underline transition-colors">{publisherName}</Link>
          </p>
        </div>

        <div className="w-full bg-white rounded-[32px] shadow-lg overflow-hidden flex flex-col border border-slate-100">
          <div className="relative w-full h-56 shrink-0 pointer-events-none">
            <div className={`absolute inset-0 bg-linear-to-br ${bgGradient}`}></div>
            {!quote.template && <div className="absolute inset-0 flex items-center justify-center bg-black/20 mix-blend-overlay"></div>}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-linear-to-t from-white via-white/80 to-transparent"></div>
          </div>
          <div className="relative bg-white px-6 pb-8 pt-2 flex flex-col items-center text-center -mt-10 z-10 pointer-events-none">
            <div className="text-[70px] font-serif font-black text-black leading-none tracking-tighter mb-1 select-none">“ ”</div>
            <p className={`font-medium text-black leading-snug wrap-break-words whitespace-pre-wrap px-2 ${getQuoteFontSize(quote.content)}`}>
              {quote.content}
            </p>
            <div className="w-full mt-8 flex flex-col items-center relative">
              <div className="w-12 h-[2px] bg-black mb-3"></div>
              <p className="text-xl font-medium text-black tracking-wide">{targetName}</p>
              <p className="text-slate-400 font-medium text-base mt-0.5">{displayHandle}</p>
              <span className="absolute bottom-0 right-0 text-slate-300 font-medium text-[11px] translate-y-6">PinQuo</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-5 px-3">
          <div className="flex items-center gap-5 text-2xl select-none">
            <button onClick={() => toggleReaction(quote.id, 'fire')} className="flex items-center gap-1.5 hover:scale-110 transition-transform active:scale-95 group cursor-pointer">
              <span className={`${quote.userReactions.fire ? 'drop-shadow-md scale-110' : 'opacity-70 group-hover:opacity-100 transition-opacity'}`}>🔥</span>
              {quote.reactionCounts.fire > 0 && <span className={`text-sm font-bold ${quote.userReactions.fire ? 'text-orange-500' : 'text-slate-400'}`}>{quote.reactionCounts.fire}</span>}
            </button>
            <button onClick={() => toggleReaction(quote.id, 'heart')} className="flex items-center gap-1.5 hover:scale-110 transition-transform active:scale-95 group cursor-pointer">
              <span className={`${quote.userReactions.heart ? 'drop-shadow-md scale-110' : 'opacity-70 group-hover:opacity-100 transition-opacity'}`}>💖</span>
              {quote.reactionCounts.heart > 0 && <span className={`text-sm font-bold ${quote.userReactions.heart ? 'text-pink-500' : 'text-slate-400'}`}>{quote.reactionCounts.heart}</span>}
            </button>
            <button onClick={() => toggleReaction(quote.id, 'hundred')} className="flex items-center gap-1.5 hover:scale-110 transition-transform active:scale-95 group cursor-pointer">
              <span className={`${quote.userReactions.hundred ? 'drop-shadow-md scale-110' : 'opacity-70 group-hover:opacity-100 transition-opacity'}`}>💯</span>
              {quote.reactionCounts.hundred > 0 && <span className={`text-sm font-bold ${quote.userReactions.hundred ? 'text-red-500' : 'text-slate-400'}`}>{quote.reactionCounts.hundred}</span>}
            </button>
          </div>
          <button onClick={() => toggleFavorite(quote.id)} title="Favourite" className="flex items-center gap-1.5 hover:scale-110 transition-transform active:scale-95 group cursor-pointer">
            <Star className={`w-8 h-8 transition-colors ${quote.isFavorited ? 'fill-yellow-400 text-yellow-500 drop-shadow-sm' : 'text-slate-400 group-hover:text-yellow-400'}`} strokeWidth={2} />
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>
  
  if (isNotFound) return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-black text-slate-800 mb-2">Not Found</h2>
      <button onClick={() => router.back()} className="px-6 py-3 bg-black text-white font-bold rounded-full">Go Back</button>
    </div>
  )

  const isOwnProfile = currentUser?.id === targetProfile?.id

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-slate-50/30 pb-24 relative overflow-x-hidden">
      
      {/* Background Graphic Pattern */}
      <div className="absolute top-0 left-0 w-full h-64 bg-linear-to-b from-slate-100 to-transparent -z-10" />

      {/* Grid Header */}
      <div className="flex flex-col items-center pt-6 pb-6 px-6 relative shrink-0">
        <button title="Go Back" onClick={() => router.back()} className="absolute left-6 top-6 p-2 -ml-2 hover:bg-slate-200/50 rounded-full transition">
          <ArrowLeft className="w-8 h-8 text-black" />
        </button>
        
        <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500/20 mb-1 drop-shadow-sm mt-2" />
        <div className="w-20 h-20 rounded-full bg-slate-200 border-[3px] border-white shadow-md flex items-center justify-center overflow-hidden mb-3">
          {targetProfile?.avatar_url ? (
            <img src={targetProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-slate-400" />
          )}
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-1">{targetProfile?.username}</h1>
        <p className="text-slate-500 font-bold text-sm">
          {isOwnProfile ? 'Published by You' : `Published by ${targetProfile?.username}`}
        </p>
      </div>

      {/* 3-Column Grid */}
      <div className="px-6 w-full">
        {quotes.length === 0 ? (
          <div className="text-center mt-10"><p className="text-slate-400 font-bold">No quotes found.</p></div>
        ) : (
          <div className="grid grid-cols-3 gap-2 w-full">
            {quotes.map((quote) => {
              const bgGradient = quote.template?.style_config?.gradient || 'from-slate-200 to-slate-300'
              return (
                <button 
                  key={quote.id}
                  title="Published Quotes"
                  onClick={() => setExpandedQuote(quote)}
                  className={`w-full aspect-square rounded-[18px] bg-linear-to-br ${bgGradient} shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform`}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Theater Modal */}
      {expandedQuote && (
        <div className="fixed inset-0 z-100 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <button 
            onClick={() => setExpandedQuote(null)}
            title="Close"
            className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-110"
          >
            <X className="w-8 h-8 text-white" />
          </button>
          <div className="w-full max-w-[550px] scale-100 sm:scale-105 transition-transform overflow-y-auto no-scrollbar max-h-[90vh]">
            {renderModalCard(expandedQuote)}
          </div>
        </div>
      )}
    </div>
  )
}