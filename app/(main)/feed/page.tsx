'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, User, X, Send, SmilePlus, Search } from 'lucide-react'
import QuoteCard, { FeedQuote, GroupedReaction, WitnessRecord } from '@/components/QuoteCard'
import Link from 'next/link'
import { EmojiClickData } from 'emoji-picker-react'
import CustomEmojiPicker from '@/components/CustomEmojiPicker'
import { useQuoteInteractions, QuoteComment } from '@/hooks/useQuoteInteractions'

// --- TYPES & CONSTANTS ---
const ITEMS_PER_PAGE = 5

const timeAgo = (dateString: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

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

// --- COMPONENT 1: ISOLATED SEARCH BAR (unchanged) ---
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
    <div className={`sticky top-4 z-40 mb-6 transition-transform duration-300 ease-in-out will-change-transform ${isSearchVisible ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0 pointer-events-none'}`} ref={searchContainerRef}>
      <div className="relative flex items-center bg-white md:bg-white/90 md:backdrop-blur-md border border-slate-200 rounded-full px-4 py-3 shadow-[0_4px_20px_rgb(0,0,0,0.05)] focus-within:ring-2 focus-within:ring-emerald-200 focus-within:border-emerald-300 transition-all">
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

// --- COMPONENT 2: ISOLATED QUOTE DETAIL MODAL ---
interface QuoteDetailModalProps {
  expandedQuote: FeedQuote
  comments: QuoteComment[]
  currentUserId: string | null
  onClose: () => void
  onReactToQuote: (emoji: EmojiClickData, quoteId: string, type: 'quote', publisherId?: string) => void
  // 💥 CHANGED: now takes the comment owner's id so comment reactions can notify
  onReactToComment: (emojiObj: EmojiClickData, commentId: string, ownerId?: string) => void
  onFavoriteQuote: (quoteId: string) => void
  onVoteWitness: (quoteId: string, voteType: 'approved' | 'denied') => void
  onPostComment: (text: string) => Promise<void>
}

function QuoteDetailModal({ expandedQuote, comments, currentUserId, onClose, onReactToQuote, onReactToComment, onFavoriteQuote, onVoteWitness, onPostComment }: QuoteDetailModalProps) {
  const [newComment, setNewComment] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [activeCommentEmojiPicker, setActiveCommentEmojiPicker] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    setTimeout(() => commentInputRef.current?.focus(), 150)
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  const handleSubmit = async () => {
    if (!newComment.trim() || isPostingComment) return
    setIsPostingComment(true)
    await onPostComment(newComment.trim())
    setNewComment('')
    setIsPostingComment(false)
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] bg-black md:bg-black/90 md:backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-0 sm:p-8 animate-in fade-in duration-200 cursor-pointer overflow-hidden will-change-transform">
      <div onClick={(e) => e.stopPropagation()} className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-[550px] bg-slate-50 sm:rounded-[40px] flex flex-col overflow-hidden cursor-default shadow-2xl relative">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-slate-200 md:bg-black/10 hover:bg-slate-300 md:hover:bg-black/20 rounded-full transition text-slate-700 md:backdrop-blur-md shadow-sm md:shadow-none will-change-transform">
          <X className="w-6 h-6" />
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-slate-50/50">
           <div className="shrink-0 bg-white shadow-sm z-10 rounded-b-[40px]">
             <QuoteCard quote={expandedQuote} isExpanded={true} onReact={onReactToQuote} onFavorite={onFavoriteQuote} onVoteWitness={onVoteWitness} />
           </div>

           <div className="p-4 sm:p-6 space-y-6 flex-1 bg-white">
              {comments.length === 0 ? (
                <div className="text-center text-slate-400 font-medium mt-10">No comments yet. Start the conversation!</div>
              ) : (
                comments.map(comment => {
                    const cReacts: Record<string, GroupedReaction> = {}
                    comment.reactions.forEach(r => {
                      if (!cReacts[r.reaction_type]) cReacts[r.reaction_type] = { emoji: r.reaction_type, count: 0, hasReacted: false }
                      cReacts[r.reaction_type].count++
                      if (r.user_id === currentUserId) cReacts[r.reaction_type].hasReacted = true
                    })
                    const groupedCommentReacts = Object.values(cReacts).sort((a,b) => b.count - a.count)

                    return (
                      <div key={comment.id} className="flex gap-3 items-start group">
                        <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0 border border-slate-200 overflow-hidden flex items-center justify-center mt-0.5">
                          {comment.user.avatar_url ? <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover"/> : <User className="w-5 h-5 text-slate-400"/>}
                        </div>
                        <div className="flex-1 flex flex-col min-w-0">
                            <div className="text-[14px] sm:text-[15px] leading-snug text-slate-800 break-words">
                              <span className="font-bold text-slate-900 mr-2">{comment.user.username}</span>
                              {comment.content}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1.5">
                              <span className="text-[12px] text-slate-400 font-medium">{timeAgo(comment.created_at)}</span>
                              <div className="flex items-center gap-1.5">
                                {groupedCommentReacts.map(r => (
                                  <button key={r.emoji} onClick={() => { setActiveCommentEmojiPicker(null); onReactToComment({emoji: r.emoji} as EmojiClickData, comment.id, comment.user.id) }} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold transition ${r.hasReacted ? 'bg-emerald-50 text-emerald-700' : 'bg-transparent text-slate-500 hover:bg-slate-100'}`}>
                                    <span>{r.emoji}</span> <span>{r.count}</span>
                                  </button>
                                ))}
                                <div className="relative">
                                  <button onClick={() => setActiveCommentEmojiPicker(prev => prev === comment.id ? null : comment.id)} className="text-slate-400 hover:text-black transition flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-100">
                                    <SmilePlus className="w-3.5 h-3.5" />
                                  </button>
                                  {activeCommentEmojiPicker === comment.id && (
                                    <div className="absolute z-50 top-full mt-1 left-0 shadow-xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 border border-slate-100">
                                      <CustomEmojiPicker onEmojiClick={(e) => { setActiveCommentEmojiPicker(null); onReactToComment(e, comment.id, comment.user.id) }} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                        </div>
                      </div>
                    )
                })
              )}
           </div>
        </div>

        <div className="p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-slate-100 shrink-0 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
           <div className="relative flex items-center max-w-2xl mx-auto">
              <input 
                ref={commentInputRef}
                type="text" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Add a comment..."
                className="flex-1 bg-slate-100 border-none rounded-full py-3 pl-5 pr-14 text-[15px] font-medium focus:ring-2 focus:ring-slate-300 transition outline-none placeholder:text-slate-500"
              />
              <button 
                onClick={handleSubmit}
                disabled={!newComment.trim() || isPostingComment}
                className="absolute right-1.5 p-2 bg-black text-white rounded-full hover:scale-105 active:scale-95 disabled:opacity-0 disabled:scale-50 transition-all duration-200"
              >
                {isPostingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />}
              </button>
           </div>
        </div>

      </div>
    </div>
  )
}

// --- COMPONENT 3: MAIN FEED DATA CONTROLLER ---
function FeedContent() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const searchParams = useSearchParams()
  const quoteIdParam = searchParams.get('quoteId')

  // Feed State
  const [quotes, setQuotes] = useState<FeedQuote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaginationLoading, setIsPaginationLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Expanded Quote & Interaction State
  const [expandedQuote, setExpandedQuote] = useState<FeedQuote | null>(null)
  const [comments, setComments] = useState<QuoteComment[]>([])

  // Scroll & Pagination State
  const [isSearchVisible, setIsSearchVisible] = useState(true)
  const lastScrollY = useRef(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const observer = useRef<IntersectionObserver | null>(null)

  // Shared reaction / comment / favorite logic (issue 3).
  // 💥 NOTE: this brings feed's reactions in line with the rest of the app -
  // multiple different emojis toggle independently (instead of the old
  // "single reaction, click swaps it" model) - and reactions/comments here
  // now trigger notifications too, which they never did before (issue 6).
  const { fetchComments, handleReaction, postComment, toggleFavorite } = useQuoteInteractions({
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

  // Scroll Listener for Sticky Search Header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) setIsSearchVisible(false)
      else if (currentScrollY < lastScrollY.current) setIsSearchVisible(true)
      lastScrollY.current = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fetch Specific Quote for Modal Sharing
  useEffect(() => {
    let isMounted = true
    const fetchSpecificQuote = async () => {
      if (!quoteIdParam) return
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
        .eq('id', quoteIdParam)
        .single()

      if (data && !error && isMounted) {
        const q = data as unknown as RawQuoteData
        setExpandedQuote(formatQuote(q, user?.id || null))
      }
    }

    fetchSpecificQuote()
    return () => { isMounted = false }
  }, [quoteIdParam, supabase])

  // Fetch Main Feed
  useEffect(() => {
    let isMounted = true
    const fetchFeed = async () => {
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

  // Fetch comments when a quote is expanded (now backed by the shared hook).
  useEffect(() => {
    if (!expandedQuote) return
    void fetchComments(expandedQuote.id)
  }, [expandedQuote, fetchComments])

  const handleCloseModal = () => {
    setExpandedQuote(null)
    if (quoteIdParam) {
      router.replace('/feed', { scroll: false })
    }
  }

  // Witness voting stays page-specific - not duplicated elsewhere.
  const handleVoteWitness = async (quoteId: string, voteType: 'approved' | 'denied') => {
    if (!currentUserId) return

    const updateWitnessState = (q: FeedQuote) => {
      const witnesses = [...(q.witnesses || [])]
      const witness = witnesses.find(w => w.witness_user_id === currentUserId)
      if (witness) witness.vote = voteType
      return { ...q, witnesses }
    }

    setQuotes(prev => prev.map(q => q.id === quoteId ? updateWitnessState(q) : q))
    if (expandedQuote?.id === quoteId) setExpandedQuote(updateWitnessState(expandedQuote))

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
              onExpand={setExpandedQuote} 
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

      {expandedQuote && (
        <QuoteDetailModal 
          expandedQuote={expandedQuote}
          comments={comments}
          currentUserId={currentUserId}
          onClose={handleCloseModal}
          onReactToQuote={handleReaction}
          onReactToComment={(e, id, ownerId) => handleReaction(e, id, 'comment', ownerId)}
          onFavoriteQuote={toggleFavorite}
          onVoteWitness={handleVoteWitness}
          onPostComment={postComment}
        />
      )}
    </div>
  )
}

// --- MAIN EXPORT ---
export default function FeedPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>}>
      <FeedContent />
    </Suspense>
  )
}