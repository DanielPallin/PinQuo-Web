'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, Loader2, User, X, Search, Share2, Check, MessageCircle, SmilePlus, Send } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import Link from 'next/link'
import Image from 'next/image'
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react'

const ITEMS_PER_PAGE = 5

// --- HELPER FUNCTIONS ---
const getQuoteFontSize = (text: string) => {
  const len = text.length
  if (len < 40) return 'text-4xl md:text-5xl'
  if (len < 80) return 'text-3xl md:text-4xl'
  if (len < 140) return 'text-2xl md:text-3xl'
  if (len < 200) return 'text-xl md:text-2xl'
  return 'text-lg md:text-xl'
}

const timeAgo = (dateString: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

// --- TYPES ---
type GroupedReaction = { emoji: string, count: number, hasReacted: boolean }

type RawQuoteData = {
  id: string
  content: string
  created_at: string
  quoted_email: string | null
  custom_author_name: string | null // ADDED: Pull custom_author_name
  publisher: { id: string, username: string } | null
  quoted_user: { username: string, avatar_url: string | null } | null
  template: { style_config: { gradient: string, baseColor: string } } | null
  reactions: { reaction_type: string, user_id: string, comment_id: string | null }[] | null
  favorites: { user_id: string }[] | null
  comments: { count: number }[] | null
}

type FeedQuote = Omit<RawQuoteData, 'reactions' | 'comments'> & {
  groupedReactions: GroupedReaction[]
  commentCount: number
  favoriteCount: number
  isFavorited: boolean
}

type CommentType = {
  id: string
  content: string
  created_at: string
  user: { id: string, username: string, avatar_url: string | null }
  reactions: { reaction_type: string, user_id: string }[]
}

type SearchProfile = { id: string, username: string, avatar_url: string | null }

export default function FeedPage() {
  const supabase = createClient()
  
  // Feed States
  const [quotes, setQuotes] = useState<FeedQuote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaginationLoading, setIsPaginationLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [expandedQuote, setExpandedQuote] = useState<FeedQuote | null>(null)
  
  // Comments & Interactive States
  const [comments, setComments] = useState<CommentType[]>([])
  const [newComment, setNewComment] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<{ id: string, type: 'quote' | 'comment' } | null>(null)

  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Fetch Logic
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
          id, content, created_at, quoted_email, custom_author_name,
          publisher:profiles!quotes_publisher_id_fkey(id, username),
          quoted_user:profiles!quotes_quoted_user_id_fkey(username, avatar_url),
          template:templates(style_config),
          reactions(reaction_type, user_id, comment_id),
          favorites(user_id),
          comments(count)
        `)
        .order('created_at', { ascending: false })
        .range(start, end)

      if (data && isMounted) {
        const rawData = data as unknown as RawQuoteData[]

        const formattedQuotes: FeedQuote[] = rawData.map((q) => {
          // Group Quote Reactions (Ignore comment reactions for the main feed)
          const quoteReacts = (q.reactions || []).filter(r => r.comment_id === null)
          const reactMap: Record<string, GroupedReaction> = {}
          
          quoteReacts.forEach((r) => {
            if (!reactMap[r.reaction_type]) {
              reactMap[r.reaction_type] = { emoji: r.reaction_type, count: 0, hasReacted: false }
            }
            reactMap[r.reaction_type].count++
            if (user && r.user_id === user.id) reactMap[r.reaction_type].hasReacted = true
          })

          return {
            ...q,
            groupedReactions: Object.values(reactMap).sort((a, b) => b.count - a.count),
            commentCount: q.comments?.[0]?.count || 0,
            favoriteCount: (q.favorites || []).length,
            isFavorited: user ? (q.favorites || []).some((f) => f.user_id === user.id) : false
          }
        })

        if (page === 0) setQuotes(formattedQuotes)
        else setQuotes((prev) => [...prev, ...formattedQuotes])

        if (formattedQuotes.length < ITEMS_PER_PAGE) setHasMore(false)
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

  // Fetch comments when Quote is expanded
  useEffect(() => {
    if (!expandedQuote) return
    const fetchComments = async () => {
      const { data } = await supabase
        .from('comments')
        .select(`
          id, content, created_at,
          user:profiles!comments_user_id_fkey(id, username, avatar_url),
          reactions(reaction_type, user_id)
        `)
        .eq('quote_id', expandedQuote.id)
        .order('created_at', { ascending: true })

      if (data) setComments(data as unknown as CommentType[])
    }
    fetchComments()
  }, [expandedQuote, supabase])

  // Click outside listener for Dropdowns & Pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false)
      }
      // If clicking outside an emoji picker, close it
      if (!(event.target as Element).closest('.emoji-picker-container') && !(event.target as Element).closest('.reaction-trigger')) {
         setActiveEmojiPicker(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // --- ACTIONS ---

  const handleDynamicReaction = async (emojiObj: EmojiClickData, targetId: string, type: 'quote' | 'comment', targetOwnerId?: string) => {
    if (!currentUserId) return
    const emoji = emojiObj.emoji
    setActiveEmojiPicker(null)

    // Check if user already reacted with this emoji
    let isRemoving = false
    if (type === 'quote') {
       const quote = quotes.find(q => q.id === targetId)
       isRemoving = quote?.groupedReactions.find(r => r.emoji === emoji)?.hasReacted || false
    }

    // Optimistic UI Update for Quotes
    if (type === 'quote') {
      const updateQuoteState = (q: FeedQuote) => {
        let newReactions = [...q.groupedReactions]
        const existing = newReactions.find(r => r.emoji === emoji)
        
        if (isRemoving && existing) {
          existing.count--
          existing.hasReacted = false
          if (existing.count === 0) newReactions = newReactions.filter(r => r.emoji !== emoji)
        } else if (!isRemoving) {
          if (existing) { existing.count++; existing.hasReacted = true }
          else newReactions.push({ emoji, count: 1, hasReacted: true })
        }
        return { ...q, groupedReactions: newReactions.sort((a,b) => b.count - a.count) }
      }
      setQuotes(prev => prev.map(q => q.id === targetId ? updateQuoteState(q) : q))
      if (expandedQuote?.id === targetId) setExpandedQuote(updateQuoteState(expandedQuote))
    }

    // DB Operations
    if (isRemoving) {
      if (type === 'quote') {
        await supabase.from('reactions').delete().match({ quote_id: targetId, user_id: currentUserId, reaction_type: emoji })
      } else {
        // Vercel is happy with this naturally, no suppression needed!
        await supabase.from('reactions').delete().match({ comment_id: targetId, user_id: currentUserId, reaction_type: emoji })
      }
    } else {
      
      type ReactionPayload = {
        user_id: string;
        reaction_type: string;
        quote_id?: string;
        comment_id?: string;
      };

      const insertData: ReactionPayload = type === 'quote' 
        ? { quote_id: targetId, user_id: currentUserId, reaction_type: emoji }
        : { comment_id: targetId, user_id: currentUserId, reaction_type: emoji }
        
      // Supabase types can be out of sync for this union payload; cast to any to satisfy TS
      await supabase.from('reactions').insert(insertData as any)

      // 🔔 NOTIFICATION SYSTEM 🔔
      if (targetOwnerId && targetOwnerId !== currentUserId) {
         await supabase.from('notifications').insert({
            receiver_id: targetOwnerId,
            actor_id: currentUserId,
            type: 'reaction',
            quote_id: type === 'quote' ? targetId : expandedQuote?.id
         })
      }
    }

    // Refresh comments if reacting to a comment to keep logic simple
    if (type === 'comment' && expandedQuote) {
      const { data } = await supabase.from('comments').select(`*, user:profiles(id, username, avatar_url), reactions(reaction_type, user_id)`).eq('quote_id', expandedQuote.id).order('created_at', { ascending: true })
      if (data) setComments(data as unknown as CommentType[])
    }
  }

  const handlePostComment = async () => {
    if (!newComment.trim() || !expandedQuote || !currentUserId) return
    setIsPostingComment(true)

    const { data, error } = await supabase.from('comments').insert({
      quote_id: expandedQuote.id,
      user_id: currentUserId,
      content: newComment.trim()
    }).select('id, content, created_at, user:profiles(id, username, avatar_url), reactions(reaction_type, user_id)').single()

    if (data) {
      setComments(prev => [...prev, data as unknown as CommentType])
      setNewComment('')
      setQuotes(prev => prev.map(q => q.id === expandedQuote.id ? { ...q, commentCount: q.commentCount + 1 } : q))

      // 🔔 NOTIFICATION SYSTEM 🔔
      if (expandedQuote.publisher && expandedQuote.publisher.id !== currentUserId) {
        await supabase.from('notifications').insert({
          receiver_id: expandedQuote.publisher.id,
          actor_id: currentUserId,
          type: 'comment',
          quote_id: expandedQuote.id
        })
      }
    }
    setIsPostingComment(false)
  }

  const toggleFavorite = async (quoteId: string) => {
     // (Favorite logic remains identical)
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

  // --- RENDERING ---

  const renderCard = (quote: FeedQuote, isExpanded: boolean = false) => {
    const publisherName = quote.publisher?.username || 'Unknown'
    const isRegisteredUser = !!quote.quoted_user?.username
    
    // EXPLICIT TARGET NAME LOGIC
    let targetName = 'Unknown';
    if (quote.custom_author_name && quote.custom_author_name.trim() !== '') {
      targetName = quote.custom_author_name;
    } else if (isRegisteredUser && quote.quoted_user?.username) {
      targetName = quote.quoted_user.username;
    } else if (quote.quoted_email && quote.quoted_email.trim() !== '') {
      targetName = 'Pending Invite';
    }

    // Only show a handle (@) if it's a registered user
    const displayHandle = isRegisteredUser ? `@${targetName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : null
    
    const bgGradient = !quote.template ? 'from-slate-800 to-slate-900' : quote.template.style_config.gradient
    const targetAvatarUrl = quote.quoted_user?.avatar_url

    return (
      <div className={`w-full flex flex-col bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 ${isExpanded ? 'p-0 pb-6 rounded-b-none' : 'p-5'}`}>
        
        {/* Publisher Header */}
        <div className={`flex items-center justify-between mb-5 px-2 ${isExpanded ? 'pt-6 px-6' : ''}`}>
          <div className="flex items-center gap-3">
            <Link href={`/${publisherName}`} className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
              <User className="w-6 h-6 text-slate-400" />
            </Link>
            <p className="text-slate-500 font-medium text-sm">
              Published by <Link href={`/${publisherName}`} className="font-bold text-slate-800 hover:text-black hover:underline">{publisherName}</Link>
            </p>
          </div>
        </div>

        {/* The Graphic */}
        <div 
          onClick={(e) => { e.stopPropagation(); if (!isExpanded) setExpandedQuote(quote) }}
          className={`w-full bg-white rounded-[32px] overflow-hidden flex flex-col border border-slate-100 relative ${!isExpanded ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg' : 'shadow-sm'}`}
        >
          <div className="relative w-full h-48 shrink-0 pointer-events-none">
            <div className={`absolute inset-0 bg-linear-to-br ${bgGradient}`}></div>
            {!quote.template && targetAvatarUrl && <img src={targetAvatarUrl} alt="Bg" className="absolute inset-0 w-full h-full object-cover opacity-90" />}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-linear-to-t from-white via-white/80 to-transparent"></div>
          </div>
          <div className="relative bg-white px-6 pb-8 pt-2 flex flex-col items-center text-center -mt-10 z-10 pointer-events-none">
            <div className="text-[70px] font-serif font-black text-black leading-none mb-1">“ ”</div>
            <p className={`font-medium text-black leading-snug whitespace-pre-wrap px-2 ${getQuoteFontSize(quote.content)}`}>{quote.content}</p>
            <div className="w-full mt-6 flex flex-col items-center">
              <div className="w-12 h-[2px] bg-black mb-3"></div>
              {/* UPDATED: Dynamic styling based on whether it's a registered user or a custom name */}
               <p className={`text-xl font-medium tracking-wide ${(!isRegisteredUser && !quote.custom_author_name) ? 'text-slate-400 italic' : 'text-black'}`}>{targetName}</p>
              {displayHandle && <p className="text-slate-400 font-medium text-sm mt-0.5">{displayHandle}</p>}
            </div>
          </div>
        </div>

        {/* Dynamic Action Bar */}
        <div className={`flex justify-between items-center mt-4 px-3 ${isExpanded ? 'px-6 border-b border-slate-50 pb-4' : ''}`}>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Render grouped reactions dynamically */}
            {quote.groupedReactions.map((r) => (
              <button 
                key={r.emoji} 
                onClick={(e) => { e.stopPropagation(); handleDynamicReaction({ emoji: r.emoji } as EmojiClickData, quote.id, 'quote', quote.publisher?.id) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors cursor-pointer ${
                  r.hasReacted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}

            {/* Add New Reaction Trigger */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveEmojiPicker(prev => prev?.id === quote.id ? null : { id: quote.id, type: 'quote' }) }}
                className="reaction-trigger w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <SmilePlus className="w-4 h-4" />
              </button>

              {activeEmojiPicker?.id === quote.id && activeEmojiPicker.type === 'quote' && (
                <div className="emoji-picker-container absolute z-50 bottom-full mb-2 left-0 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <EmojiPicker theme={Theme.LIGHT} onEmojiClick={(emoji) => handleDynamicReaction(emoji, quote.id, 'quote', quote.publisher?.id)} />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            {/* Comment Counter */}
            {!isExpanded && (
               <button onClick={(e) => { e.stopPropagation(); setExpandedQuote(quote) }} className="flex items-center gap-1.5 hover:text-black transition cursor-pointer">
                 <MessageCircle className="w-5 h-5" />
                 <span className="font-bold text-sm">{quote.commentCount}</span>
               </button>
            )}
            {/* Favorite */}
            <button onClick={(e) => { e.stopPropagation(); toggleFavorite(quote.id) }} className={`hover:scale-110 transition-transform cursor-pointer ${quote.isFavorited ? 'text-yellow-400 fill-yellow-400' : 'hover:text-yellow-400'}`}>
              <Star className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
        </div>

      </div>
    )
  }

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-slate-50/50 pb-24 relative">
      
      {/* Header Area */}
      <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-md pt-6 pb-4 px-6 flex justify-between items-center border-b border-slate-200/50">
        <Image src="/PinQuo_logo.png" alt="PinQuo Logo" width={130} height={40} priority className="h-9 w-auto object-contain" />
        <NotificationBell />
      </div>

      {/* Main Feed Grid */}
      <div className="px-4 mt-4">
        {isLoading ? (
          <div className="flex justify-center mt-20"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>
        ) : (
          <div className="flex flex-col gap-6">
            {quotes.map((quote) => (<div key={quote.id}>{renderCard(quote)}</div>))}
            {hasMore && (
              <button onClick={() => setPage((p) => p + 1)} disabled={isPaginationLoading} className="w-full py-4 bg-white border-2 border-slate-200/60 rounded-3xl font-black text-slate-600 hover:text-black transition">
                {isPaginationLoading ? 'Loading...' : 'Load More Quotes'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Quote & Comments */}
      {expandedQuote && (
        <div onClick={() => setExpandedQuote(null)} className="fixed inset-0 z-100 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-0 sm:p-8 animate-in fade-in duration-200 cursor-pointer overflow-hidden">
          
          <div onClick={(e) => e.stopPropagation()} className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-550px bg-slate-50 sm:rounded-[40px] flex flex-col overflow-hidden cursor-default shadow-2xl relative">
            
            {/* The Quote Half */}
            <div className="shrink-0 relative">
               <button onClick={() => setExpandedQuote(null)} className="absolute top-4 right-4 z-50 p-2 bg-black/10 hover:bg-black/20 rounded-full transition text-slate-700 backdrop-blur-md">
                 <X className="w-6 h-6" />
               </button>
               {renderCard(expandedQuote, true)}
            </div>

            {/* The Comments Thread Half */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-5 bg-slate-50/50">
               {comments.length === 0 ? (
                  <div className="text-center text-slate-400 font-bold mt-10">No comments yet. Start the conversation!</div>
               ) : (
                 comments.map(comment => {
                    // Group comment reactions dynamically
                    const cReacts: Record<string, GroupedReaction> = {}
                    comment.reactions.forEach(r => {
                      if (!cReacts[r.reaction_type]) cReacts[r.reaction_type] = { emoji: r.reaction_type, count: 0, hasReacted: false }
                      cReacts[r.reaction_type].count++
                      if (r.user_id === currentUserId) cReacts[r.reaction_type].hasReacted = true
                    })
                    const groupedCommentReacts = Object.values(cReacts).sort((a,b) => b.count - a.count)

                    return (
                      <div key={comment.id} className="flex gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 border border-slate-300 overflow-hidden">
                           {comment.user.avatar_url ? <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover"/> : <User className="w-full h-full p-2 text-slate-400"/>}
                         </div>
                         <div className="flex-1">
                            <div className="bg-white p-3.5 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm">
                               <div className="flex items-center gap-2 mb-1">
                                 <span className="font-bold text-slate-900 text-sm">{comment.user.username}</span>
                                 <span className="text-xs text-slate-400 font-medium">{timeAgo(comment.created_at)}</span>
                               </div>
                               <p className="text-slate-700 text-sm leading-relaxed">{comment.content}</p>
                            </div>
                            
                            {/* Comment Reactions */}
                            <div className="flex items-center gap-1.5 mt-1.5 ml-2">
                               {groupedCommentReacts.map(r => (
                                 <button key={r.emoji} onClick={() => handleDynamicReaction({emoji: r.emoji} as EmojiClickData, comment.id, 'comment', comment.user.id)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition ${r.hasReacted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                   <span>{r.emoji}</span> <span>{r.count}</span>
                                 </button>
                               ))}
                               <div className="relative">
                                 <button onClick={() => setActiveEmojiPicker(prev => prev?.id === comment.id ? null : {id: comment.id, type: 'comment'})} className="reaction-trigger text-slate-400 hover:text-black p-1 transition"><SmilePlus className="w-3.5 h-3.5" /></button>
                                 {activeEmojiPicker?.id === comment.id && activeEmojiPicker.type === 'comment' && (
                                    <div className="emoji-picker-container absolute z-50 top-full mt-1 left-0 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                      <EmojiPicker theme={Theme.LIGHT} onEmojiClick={(e) => handleDynamicReaction(e, comment.id, 'comment', comment.user.id)} />
                                    </div>
                                 )}
                               </div>
                            </div>
                         </div>
                      </div>
                    )
                 })
               )}
            </div>

            {/* Comment Input */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0 mb-safe">
               <div className="relative flex items-center">
                 <input 
                   type="text" 
                   value={newComment}
                   onChange={e => setNewComment(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                   placeholder="Write a comment..."
                   className="w-full bg-slate-100 border-none rounded-full py-3.5 pl-5 pr-12 text-sm font-medium focus:ring-2 focus:ring-emerald-200 transition outline-none"
                 />
                 <button 
                   onClick={handlePostComment}
                   disabled={!newComment.trim() || isPostingComment}
                   className="absolute right-2 p-2 bg-black text-white rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition"
                 >
                   {isPostingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                 </button>
               </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}