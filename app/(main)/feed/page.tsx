'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, User, X, Search } from 'lucide-react'
import QuoteCard, { FeedQuote, GroupedReaction, WitnessRecord } from '@/components/QuoteCard'
import Link from 'next/link'
import { useQuoteInteractions } from '@/hooks/useQuoteInteractions'

const ITEMS_PER_PAGE = 5

type RawQuoteData = {
  id: string
  content: string
  created_at: string
  quoted_email: string | null
  custom_author_name: string | null
  live_photo_url: string | null 
  publisher: { id: string, username: string, avatar_url: string | null } | null
  quoted_user: { id: string, username: string, avatar_url: string | null } | null
  template: { style_config: { gradient?: string, baseColor?: string }, image_url: string | null } | null
  reactions: { reaction_type: string, user_id: string, comment_id: string | null }[] | null
  favorites: { user_id: string }[] | null
  comments: { count: number }[] | null
  quote_witnesses: WitnessRecord[] | null
}

type SearchProfile = {
  id: string
  username: string
  avatar_url: string | null
}

const formatQuote = (q: RawQuoteData, userId: string | null): FeedQuote => {
  const quoteReacts = (q.reactions || []).filter(r => r.comment_id === null)
  const reactMap: Record<string, GroupedReaction> = {}
  
  quoteReacts.forEach((r) => {
    if (!reactMap[r.reaction_type]) {
      reactMap[r.reaction_type] = { emoji: r.reaction_type, count: 0, hasReacted: false }
    }
    reactMap[r.reaction_type].count++
    if (userId && r.user_id === userId) reactMap[r.reaction_type].hasReacted = true
  })

  return {
    ...q,
    witnesses: q.quote_witnesses || [],
    groupedReactions: Object.values(reactMap).sort((a, b) => b.count - a.count),
    commentCount: q.comments?.[0]?.count || 0,
    favoriteCount: (q.favorites || []).length,
    isFavorited: userId ? (q.favorites || []).some((f) => f.user_id === userId) : false
  }
}

// Search Bar Component
function FeedSearch({ isSearchVisible }: { isSearchVisible: boolean }) {
  const [supabase] = useState(() => createClient())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        setIsSearching(false)
        return
      }
      setIsSearching(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(5)

      if (active) {
        if (data && !error) setSearchResults(data as SearchProfile[])
        setIsSearching(false)
      }
    }

    const delayDebounceFn = setTimeout(() => { void searchUsers() }, 300)
    return () => { active = false; clearTimeout(delayDebounceFn) }
  }, [searchQuery, supabase])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`sticky top-4 z-40 mb-6 mt-2 transition-transform duration-300 ease-in-out will-change-transform ${isSearchVisible ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0 pointer-events-none'}`} ref={searchContainerRef}>
      <div className="relative flex items-center mt-4 bg-white md:bg-white/90 md:backdrop-blur-md border border-slate-200 rounded-full px-4 py-3 shadow-[0_4px_20px_rgb(0,0,0,0.05)] focus-within:ring-2 focus-within:ring-emerald-200 focus-within:border-emerald-300 transition-all">
        <Search className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true) }}
          onFocus={() => setShowSearchDropdown(true)}
          placeholder="Search users..."
          className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400"
        />
        {isSearching && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        {searchQuery && !isSearching && (
          <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDropdown(false); }} className="p-1 hover:bg-slate-100 rounded-full transition">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {showSearchDropdown && searchQuery.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
          {searchResults.length > 0 ? (
            <div className="flex flex-col">
              {searchResults.map((user) => (
                <Link key={user.id} href={`/${user.username}`} onClick={() => setShowSearchDropdown(false)} className="flex items-center gap-3 p-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-none">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                    {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-400" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{user.username}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : !isSearching ? (
            <div className="p-4 text-center text-slate-500 text-sm font-medium">No users found.</div>
          ) : null}
        </div>
      )}
    </div>
  )
}

// MAIN FEED DATA controller / FETCHFEED / SAVE TO SESSION STORAGE / REALTIME CHECK FOR NEW QUOTES
function FeedContent() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const [quotes, setQuotes] = useState<FeedQuote[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('pinquo_feed_quotes')
      if (cached) return JSON.parse(cached)
    }
    return []
  })
  const [page, setPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('pinquo_feed_page')
      if (cached) return Number(cached)
    }
    return 0
  })
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
       return !sessionStorage.getItem('pinquo_feed_quotes')
    }
    return true
  })

  const [isPaginationLoading, setIsPaginationLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  const [expandedQuote, setExpandedQuote] = useState<FeedQuote | null>(null)
  const [comments, setComments] = useState<any[]>([])

  const [isSearchVisible, setIsSearchVisible] = useState(true)
  const lastScrollY = useRef(0)
  const [hasMore, setHasMore] = useState(true)
  const observer = useRef<IntersectionObserver | null>(null)

  const { handleReaction, toggleFavorite } = useQuoteInteractions({
    supabase,
    currentUserId,
    quotes,
    setQuotes,
    expandedQuote,
    setExpandedQuote,
    comments,
    setComments,
  })
  
  const bottomBoundaryRef = useCallback((node: HTMLDivElement | null) => {
    if (isPaginationLoading) return
    if (observer.current) observer.current.disconnect()

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) setPage((prev) => prev + 1)
    }, { rootMargin: '200px' })

    if (node) observer.current.observe(node)
  }, [isPaginationLoading, hasMore])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) setIsSearchVisible(false)
      else if (currentScrollY < lastScrollY.current) setIsSearchVisible(true)
      lastScrollY.current = currentScrollY

      sessionStorage.setItem('pinquo_feed_scroll', currentScrollY.toString())
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    let isMounted = true
    const checkForNewQuotes = async () => {

      const cached = sessionStorage.getItem('pinquo_feed_quotes')
      if (!cached) return
      
      const parsedCache = JSON.parse(cached)
      if (parsedCache.length === 0) return
      
      const latestDate = parsedCache[0].created_at

      const { data: { user } } = await supabase.auth.getUser()


      const { data, error } = await supabase
        .from('quotes')
        .select(`
          id, content, created_at, quoted_email, custom_author_name, live_photo_url,
          publisher:profiles!quotes_publisher_id_fkey(id, username, avatar_url),
          quoted_user:profiles!quotes_quoted_user_id_fkey(id, username, avatar_url),
          template:templates(style_config, image_url),
          reactions(reaction_type, user_id, comment_id),
          favorites(user_id),
          comments(count),
          quote_witnesses(id, witness_user_id, witness_email, vote)
        `)
        .gt('created_at', latestDate)
        .order('created_at', { ascending: false })

      if (data && data.length > 0 && isMounted) {
        const rawData = data as unknown as RawQuoteData[]
        const formattedQuotes = rawData.map(q => formatQuote(q, user?.id || null))

        setQuotes(prev => {
          const newQuotes = formattedQuotes.filter(newQ => !prev.some(existing => existing.id === newQ.id))
          return [...newQuotes, ...prev]
        })
      }
    }

    const timer = setTimeout(() => {
      checkForNewQuotes()
    }, 500)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [supabase])

  useEffect(() => {
    let isMounted = true
    const fetchFeed = async () => {
      
      if (page === 0 && quotes.length > 0 && !isLoading) {
        const savedScroll = sessionStorage.getItem('pinquo_feed_scroll')
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, Number(savedScroll)), 10)
        }
        return
      }

      if (page === 0) setIsLoading(true)
      else setIsPaginationLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (user && isMounted) setCurrentUserId(user.id)

      const start = page * ITEMS_PER_PAGE
      const end = start + ITEMS_PER_PAGE - 1

      const { data } = await supabase
        .from('quotes')
        .select(`
          id, content, created_at, quoted_email, custom_author_name, live_photo_url,
          publisher:profiles!quotes_publisher_id_fkey(id, username, avatar_url),
          quoted_user:profiles!quotes_quoted_user_id_fkey(id, username, avatar_url),
          template:templates(style_config, image_url),
          reactions(reaction_type, user_id, comment_id),
          favorites(user_id),
          comments(count),
          quote_witnesses(id, witness_user_id, witness_email, vote)
        `)
        .order('created_at', { ascending: false })
        .range(start, end)

      if (data && isMounted) {
        const rawData = data as unknown as RawQuoteData[]
        const formattedQuotes = rawData.map(q => formatQuote(q, user?.id || null))

        if (page === 0) setQuotes(formattedQuotes)
        else setQuotes((prev) => {
          const newQuotes = formattedQuotes.filter(newQ => !prev.some(existingQ => existingQ.id === newQ.id))
          return [...prev, ...newQuotes]
        })

        if (formattedQuotes.length < ITEMS_PER_PAGE) setHasMore(false)
      }
      
      if (isMounted) {
        setIsLoading(false)
        setIsPaginationLoading(false)
      }
    }

    void fetchFeed()
    return () => { isMounted = false }
  }, [supabase, page])

  useEffect(() => {
    if (quotes.length > 0) {
      sessionStorage.setItem('pinquo_feed_quotes', JSON.stringify(quotes))
      sessionStorage.setItem('pinquo_feed_page', page.toString())
    }
  }, [quotes, page])

  const handleVoteWitness = async (quoteId: string, voteType: 'approved' | 'denied') => {
    if (!currentUserId) return

    const updateWitnessState = (q: FeedQuote) => {
      const witnesses = [...(q.witnesses || [])]
      const witness = witnesses.find(w => w.witness_user_id === currentUserId)
      if (witness) witness.vote = voteType
      return { ...q, witnesses }
    }

    setQuotes(prev => prev.map(q => q.id === quoteId ? updateWitnessState(q) : q))
    await supabase.from('quote_witnesses').update({ vote: voteType }).match({ quote_id: quoteId, witness_user_id: currentUserId })
  }

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-slate-50/50 pb-24 dark:bg-black relative px-4 mt-4">
      
      <FeedSearch isSearchVisible={isSearchVisible} />

      {isLoading ? (
        <div className="flex justify-center mt-20"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {quotes.map((quote) => (
            <QuoteCard 
              key={quote.id} 
              quote={quote} 
              onReact={handleReaction} 
              onExpand={(q) => router.push(`/quote/${q.id}`)} 
              onFavorite={toggleFavorite} 
              onVoteWitness={handleVoteWitness}
            />
          ))}
          
          {hasMore && (
            <div ref={bottomBoundaryRef} className="w-full flex justify-center py-10 mt-4">
              {isPaginationLoading ? <Loader2 className="w-8 h-8 animate-spin text-slate-400" /> : <div className="w-2 h-2 bg-slate-300 rounded-full"></div>}
            </div>
          )}
          
          {!hasMore && quotes.length > 0 && (
            <div className="w-full flex justify-center py-10 mt-4">
               <span className="text-sm font-bold text-slate-400">You're all caught up!</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>}>
      <FeedContent />
    </Suspense>
  )
}