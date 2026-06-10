'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, Loader2, User, X, Search, Share2, Check } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import Link from 'next/link'

const ITEMS_PER_PAGE = 5

const getQuoteFontSize = (text: string) => {
  const len = text.length
  if (len < 40) return 'text-4xl md:text-5xl'
  if (len < 80) return 'text-3xl md:text-4xl'
  if (len < 140) return 'text-2xl md:text-3xl'
  if (len < 200) return 'text-xl md:text-2xl'
  return 'text-lg md:text-xl'
}

type RawReaction = { reaction_type: string, user_id: string }
type RawFavorite = { user_id: string }

type RawQuoteData = {
  id: string
  content: string
  created_at: string
  quoted_email: string | null
  publisher: { username: string } | null
  quoted_user: { username: string, avatar_url: string | null } | null
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
  quoted_user: { username: string, avatar_url: string | null } | null
  template: { style_config: { gradient: string, baseColor: string } } | null
  reactionCounts: { fire: number, heart: number, hundred: number }
  userReactions: { fire: boolean, heart: boolean, hundred: boolean }
  favoriteCount: number
  isFavorited: boolean
}

type SearchProfile = {
  id: string
  username: string
  avatar_url: string | null
}

export default function FeedPage() {
  const supabase = createClient()
  
  // Feed & Layout States
  const [quotes, setQuotes] = useState<FeedQuote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaginationLoading, setIsPaginationLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [expandedQuote, setExpandedQuote] = useState<FeedQuote | null>(null)
  
  // Pagination States
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Search Discovery States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Clipboard Sharing Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Fetch Logic supporting batch-loading
  useEffect(() => {
    let isMounted = true

    const fetchFeed = async () => {
      if (page === 0) setIsLoading(true)
      else setIsPaginationLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (user && isMounted) setCurrentUserId(user.id)

      const start = page * ITEMS_PER_PAGE
      const end = start + ITEMS_PER_PAGE - 1

      const { data, error } = await supabase
        .from('quotes')
        .select(`
          id, content, created_at, quoted_email,
          publisher:profiles!quotes_publisher_id_fkey(username),
          quoted_user:profiles!quotes_quoted_user_id_fkey(username, avatar_url),
          template:templates(style_config),
          reactions(reaction_type, user_id),
          favorites(user_id)
        `)
        .order('created_at', { ascending: false })
        .range(start, end)

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

        if (page === 0) {
          setQuotes(formattedQuotes)
        } else {
          setQuotes((prev) => [...prev, ...formattedQuotes])
        }

        if (formattedQuotes.length < ITEMS_PER_PAGE) {
          setHasMore(false)
        }
      } else if (error) {
        console.error("Error fetching feed:", error)
      }
      
      if (isMounted) {
        setIsLoading(false)
        setIsPaginationLoading(false)
      }
    }

    void fetchFeed()
    return () => { isMounted = false }
  }, [supabase, page])

  // Debounced Realtime profilesearch
  useEffect(() => {
    if (!searchQuery.trim()) {
      return
    }

    const delayDebounce = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(5)
      
      setSearchResults((data as SearchProfile[]) || [])
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery, supabase])

  // Click outside listener to drop search visual window safely
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleShareQuote = async (e: React.MouseEvent, quote: FeedQuote) => {
    e.stopPropagation()
    const profileUrl = `${window.location.origin}/${quote.publisher?.username || ''}`
    
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopiedId(quote.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text path:', err)
    }
  }

  const toggleReaction = async (quoteId: string, type: 'fire' | 'heart' | 'hundred') => {
    if (!currentUserId) return
    const dbType = type === 'hundred' ? '100' : type
    const quote = quotes.find((q) => q.id === quoteId)
    if (!quote) return
    const isAdding = !quote.userReactions[type]

    const updateQuoteState = (q: FeedQuote) => ({
      ...q,
      reactionCounts: { ...q.reactionCounts, [type]: q.reactionCounts[type] + (isAdding ? 1 : -1) },
      userReactions: { ...q.userReactions, [type]: isAdding }
    })

    setQuotes((prev) => prev.map((q) => q.id === quoteId ? updateQuoteState(q) : q))
    if (expandedQuote?.id === quoteId) setExpandedQuote(updateQuoteState(expandedQuote))

    if (isAdding) await supabase.from('reactions').insert({ quote_id: quoteId, user_id: currentUserId, reaction_type: dbType })
    else await supabase.from('reactions').delete().match({ quote_id: quoteId, user_id: currentUserId, reaction_type: dbType })
  }

  const toggleFavorite = async (quoteId: string) => {
    if (!currentUserId) return
    const quote = quotes.find((q) => q.id === quoteId)
    if (!quote) return
    const isAdding = !quote.isFavorited

    const updateFavoriteState = (q: FeedQuote) => ({ ...q, favoriteCount: q.favoriteCount + (isAdding ? 1 : -1), isFavorited: isAdding })

    setQuotes((prev) => prev.map((q) => q.id === quoteId ? updateFavoriteState(q) : q))
    if (expandedQuote?.id === quoteId) setExpandedQuote(updateFavoriteState(expandedQuote))

    if (isAdding) await supabase.from('favorites').insert({ quote_id: quoteId, user_id: currentUserId })
    else await supabase.from('favorites').delete().match({ quote_id: quoteId, user_id: currentUserId })
  }

  const renderCard = (quote: FeedQuote, isExpanded: boolean = false) => {
    const publisherName = quote.publisher?.username || 'Unknown'
    const isRegisteredUser = !!quote.quoted_user?.username
    const targetName = isRegisteredUser ? (quote.quoted_user?.username ?? 'Unknown') : (quote.quoted_email ? 'Pending Invite' : 'Unknown')
    const displayHandle = isRegisteredUser ? `@${targetName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : null
    
    const isAvatarBg = !quote.template
    const targetAvatarUrl = quote.quoted_user?.avatar_url
    const bgGradient = isAvatarBg ? 'from-slate-800 to-slate-900' : quote.template?.style_config?.gradient || 'from-indigo-500 to-purple-600'

    return (
      <div className="w-full flex flex-col bg-white rounded-[40px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        
        {/* Publisher Header */}
        <div className="flex items-center justify-between mb-5 px-2">
          <div className="flex items-center gap-3">
            <Link href={`/${publisherName}`} className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 hover:ring-2 hover:ring-slate-200 transition-all">
              <User className="w-6 h-6 text-slate-400" />
            </Link>
            <p className="text-slate-500 font-medium text-sm">
              Published by <Link href={`/${publisherName}`} className="font-bold text-slate-800 hover:text-black hover:underline transition-colors">{publisherName}</Link>
            </p>
          </div>
          
          <button 
            onClick={(e) => handleShareQuote(e, quote)}
            className="p-2 text-slate-400 hover:text-black rounded-full hover:bg-slate-100 transition relative cursor-pointer"
            title="Dela länk till profil"
          >
            {copiedId === quote.id ? (
              <Check className="w-5 h-5 text-emerald-600 scale-110 transition-transform" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Meme Quote Graphic Card Component */}
        <div 
          onClick={() => !isExpanded && setExpandedQuote(quote)}
          className={`w-full bg-white rounded-[32px] shadow-lg overflow-hidden flex flex-col border border-slate-100 transition-transform ${
            !isExpanded ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
          }`}
        >
          <div className="relative w-full h-56 shrink-0 pointer-events-none">
            <div className={`absolute inset-0 bg-linear-to-br ${bgGradient}`}></div>
            {isAvatarBg && targetAvatarUrl && (
              <img src={targetAvatarUrl} alt="Avatar Background" className="absolute inset-0 w-full h-full object-cover opacity-90" />
            )}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-linear-to-t from-white via-white/80 to-transparent"></div>
          </div>

          <div className="relative bg-white px-6 pb-8 pt-2 flex flex-col items-center text-center -mt-10 z-10 pointer-events-none">
            <div className="text-[70px] font-serif font-black text-black leading-none tracking-tighter mb-1 select-none">“ ”</div>
            <p className={`font-medium text-black leading-snug wrap-break-words whitespace-pre-wrap px-2 ${getQuoteFontSize(quote.content)}`}>
              {quote.content}
            </p>
            <div className="w-full mt-8 flex flex-col items-center relative">
              <div className="w-12 h-[2px] bg-black mb-3"></div>
              <p className={`text-xl font-medium tracking-wide ${!isRegisteredUser ? 'text-slate-400 italic' : 'text-black'}`}>{targetName}</p>
              {displayHandle && <p className="text-slate-400 font-medium text-base mt-0.5">{displayHandle}</p>}
              <span className="absolute bottom-0 right-0 text-slate-300 font-medium text-[11px] translate-y-6">PinQuo</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
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

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-slate-50/50 pb-24 relative">
      
      {/* Sticky Header Layer */}
      <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-md pt-6 pb-4 px-6 flex justify-between items-center shrink-0 border-b border-slate-200/50 shadow-sm">
        <h1 className="text-4xl font-black text-black tracking-tight">PinQuo</h1>
        <NotificationBell />
      </div>

      {/* Discovery Search Interface */}
      <div className="px-4 mt-4 relative" ref={searchContainerRef}>
        <div className="relative w-full shadow-xs rounded-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search usernames on PinQuo..."
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value
              setSearchQuery(value)
              if (!value.trim()) {
                setSearchResults([])
              }
              setShowSearchDropdown(true)
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="w-full bg-white border border-slate-200 text-slate-800 pl-12 pr-4 py-3.5 rounded-2xl font-medium outline-hidden focus:border-black focus:ring-1 focus:ring-black transition"
          />
        </div>

        {/* Live Search Dropdown */}
        {showSearchDropdown && searchQuery.trim() && (
          <div className="absolute left-4 right-4 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-slate-400 font-bold text-sm">No profiles match "{searchQuery}"</div>
            ) : (
              <div className="flex flex-col">
                {searchResults.map((user) => (
                  <Link 
                    key={user.id} 
                    href={`/${user.username}`}
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults([])
                      setShowSearchDropdown(false)
                    }}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <span className="font-bold text-slate-800 group-hover:text-black transition-colors">
                      {user.username}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Timeline Feed Grid */}
      <div className="px-4 mt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <Loader2 className="w-12 h-12 animate-spin text-slate-300" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center mt-20">
            <p className="text-slate-500 font-bold text-xl">No quotes found. Be the first!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {quotes.map((quote) => (
              <div key={quote.id}>
                {renderCard(quote)}
              </div>
            ))}

            {/* Pagination Loading trigger */}
            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isPaginationLoading}
                className="w-full py-4 mt-2 bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-slate-200/60 rounded-3xl font-black text-[15px] text-slate-700 hover:text-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPaginationLoading ? (
                  <>
                    Loading Next Batch... <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </>
                ) : (
                  'Load More Quotes'
                )}
              </button>
            )}

            {!hasMore && quotes.length > 0 && (
              <div className="text-center py-6 text-slate-300 font-bold text-sm tracking-wide select-none">
                ✨ You have reached the end of the feed, come back soon for more quotes. ✨
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Theater View Modal Window Backdrop */}
      {expandedQuote && (
        <div className="fixed inset-0 z-100 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <button 
            onClick={() => setExpandedQuote(null)}
            title="Close"
            className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10 cursor-pointer"
          >
            <X className="w-8 h-8 text-white" />
          </button>
          <div className="w-full max-w-[550px] scale-100 sm:scale-105 transition-transform overflow-y-auto no-scrollbar max-h-[90vh]">
            {renderCard(expandedQuote!, true)}
          </div>
        </div>
      )}

    </div>
  )
}