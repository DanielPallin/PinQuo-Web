'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Crown, User, Loader2, X, Send, SmilePlus } from 'lucide-react'
import Link from 'next/link'
import QuoteCard, { FeedQuote, GroupedReaction } from '@/components/QuoteCard'
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react'

const timeAgo = (dateString: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

type Profile = { id: string; username: string; avatar_url: string | null }

type CommentType = {
  id: string
  content: string
  created_at: string
  user: { id: string, username: string, avatar_url: string | null }
  reactions: { reaction_type: string, user_id: string }[]
}

type RawQuoteData = {
  id: string
  content: string
  created_at: string
  quoted_email: string | null
  custom_author_name: string | null
  publisher: { id: string, username: string } | null
  quoted_user: { username: string, avatar_url: string | null } | null
  template: { style_config: { gradient: string, baseColor: string } } | null
  reactions: { reaction_type: string, user_id: string, comment_id: string | null }[] | null
  favorites: { user_id: string }[] | null
  comments: { count: number }[] | null
}

export default function PublishedPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  
  const usernameParam = typeof params?.username === 'string' ? decodeURIComponent(params.username) : ''

  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null)
  const [quotes, setQuotes] = useState<FeedQuote[]>([])
  const [expandedQuote, setExpandedQuote] = useState<FeedQuote | null>(null)

  const [comments, setComments] = useState<CommentType[]>([])
  const [newComment, setNewComment] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [activeCommentEmojiPicker, setActiveCommentEmojiPicker] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchGrid = async () => {
      if (!usernameParam) return

      const { data: { user } } = await supabase.auth.getUser()
      if (user && isMounted) setCurrentUserId(user.id)

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
        .eq('publisher_id', profileData.id)
        .order('created_at', { ascending: false })

      if (data && isMounted) {
        const rawData = data as unknown as RawQuoteData[]
        const formattedQuotes: FeedQuote[] = rawData.map((q) => {
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

        setQuotes(formattedQuotes)
      } else if (error) {
        console.error("Error fetching quotes:", error)
      }
      if (isMounted) setIsLoading(false)
    }

    void fetchGrid()
    return () => { isMounted = false }
  }, [supabase, usernameParam])

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

  const handleDynamicReaction = async (emojiObj: EmojiClickData, targetId: string, type: 'quote' | 'comment', targetOwnerId?: string) => {
    if (!currentUserId) return
    const emoji = emojiObj.emoji
    if (type === 'comment') setActiveCommentEmojiPicker(null)

    let isRemoving = false
    if (type === 'quote') {
       const quote = quotes.find(q => q.id === targetId)
       isRemoving = quote?.groupedReactions.find(r => r.emoji === emoji)?.hasReacted || false
    }

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

    if (isRemoving) {
      if (type === 'quote') {
        await supabase.from('reactions').delete().match({ quote_id: targetId, user_id: currentUserId, reaction_type: emoji })
      } else {
        await supabase.from('reactions').delete().match({ comment_id: targetId, user_id: currentUserId, reaction_type: emoji })
      }
    } else {
      type ReactionPayload = { user_id: string; reaction_type: string; quote_id?: string; comment_id?: string; };
      const insertData: ReactionPayload = type === 'quote' 
        ? { quote_id: targetId, user_id: currentUserId, reaction_type: emoji }
        : { comment_id: targetId, user_id: currentUserId, reaction_type: emoji }
        
      await supabase.from('reactions').insert(insertData as any)

      if (targetOwnerId && targetOwnerId !== currentUserId) {
         await supabase.from('notifications').insert({
            receiver_id: targetOwnerId,
            actor_id: currentUserId,
            type: 'reaction',
            quote_id: type === 'quote' ? targetId : expandedQuote?.id
         })
      }
    }

    if (type === 'comment' && expandedQuote) {
      const { data } = await supabase.from('comments').select(`*, user:profiles(id, username, avatar_url), reactions(reaction_type, user_id)`).eq('quote_id', expandedQuote.id).order('created_at', { ascending: true })
      if (data) setComments(data as unknown as CommentType[])
    }
  }

  const handlePostComment = async () => {
    if (!newComment.trim() || !expandedQuote || !currentUserId) return
    setIsPostingComment(true)

    const { data } = await supabase.from('comments').insert({
      quote_id: expandedQuote.id,
      user_id: currentUserId,
      content: newComment.trim()
    }).select('id, content, created_at, user:profiles(id, username, avatar_url), reactions(reaction_type, user_id)').single()

    if (data) {
      setComments(prev => [...prev, data as unknown as CommentType])
      setNewComment('')
      setQuotes(prev => prev.map(q => q.id === expandedQuote.id ? { ...q, commentCount: q.commentCount + 1 } : q))

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
    if (!currentUserId) return
    const quote = quotes.find((q) => q.id === quoteId)
    if (!quote) return
    const isAdding = !quote.isFavorited

    const updateQuote = (q: FeedQuote) => ({ ...q, favoriteCount: q.favoriteCount + (isAdding ? 1 : -1), isFavorited: isAdding })
    
    setQuotes((prev) => prev.map((q) => q.id === quoteId ? updateQuote(q) : q))
    if (expandedQuote?.id === quoteId) setExpandedQuote(updateQuote(expandedQuote))

    if (isAdding) await supabase.from('favorites').insert({ quote_id: quoteId, user_id: currentUserId })
    else await supabase.from('favorites').delete().match({ quote_id: quoteId, user_id: currentUserId })
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>
  
  if (isNotFound) return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-black text-slate-800 mb-2">Not Found</h2>
      <button onClick={() => router.back()} className="px-6 py-3 bg-black text-white font-bold rounded-full">Go Back</button>
    </div>
  )

  const isOwnProfile = currentUserId === targetProfile?.id

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-slate-50/30 pb-24 relative overflow-x-hidden">
      
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
              const isAvatarBg = !quote.template
              const targetAvatarUrl = quote.quoted_user?.avatar_url
              const bgGradient = isAvatarBg ? 'from-slate-800 to-slate-900' : quote.template?.style_config?.gradient || 'from-slate-200 to-slate-300'

              return (
                <button 
                  key={quote.id}
                  title="Published Quotes"
                  onClick={() => setExpandedQuote(quote)}
                  className="w-full aspect-square rounded-[18px] bg-linear-to-br shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform relative overflow-hidden cursor-pointer"
                  style={{ backgroundImage: isAvatarBg && targetAvatarUrl ? `url(${targetAvatarUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  {!isAvatarBg && <div className={`absolute inset-0 bg-linear-to-br ${bgGradient}`} />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Theater Modal with Comments */}
      {expandedQuote && (
        <div onClick={() => setExpandedQuote(null)} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-0 sm:p-8 animate-in fade-in duration-200 cursor-pointer overflow-hidden">
          <div onClick={(e) => e.stopPropagation()} className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-[550px] bg-slate-50 sm:rounded-[40px] flex flex-col overflow-hidden cursor-default shadow-2xl relative">
            
            <div className="shrink-0 relative">
               <button onClick={() => setExpandedQuote(null)} className="absolute top-4 right-4 z-50 p-2 bg-black/10 hover:bg-black/20 rounded-full transition text-slate-700 backdrop-blur-md">
                 <X className="w-6 h-6" />
               </button>
               <QuoteCard 
                 quote={expandedQuote} 
                 isExpanded={true} 
                 onReact={handleDynamicReaction} 
                 onFavorite={toggleFavorite} 
               />
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-5 bg-slate-50/50">
               {comments.length === 0 ? (
                  <div className="text-center text-slate-400 font-bold mt-10">No comments yet. Start the conversation!</div>
               ) : (
                 comments.map(comment => {
                    const cReacts: Record<string, GroupedReaction> = {}
                    comment.reactions.forEach(r => {
                      if (!cReacts[r.reaction_type]) cReacts[r.reaction_type] = { emoji: r.reaction_type, count: 0, hasReacted: false }
                      cReacts[r.reaction_type].count++
                      if (currentUserId && r.user_id === currentUserId) cReacts[r.reaction_type].hasReacted = true
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
                            
                            <div className="flex items-center gap-1.5 mt-1.5 ml-2">
                               {groupedCommentReacts.map(r => (
                                 <button key={r.emoji} onClick={() => handleDynamicReaction({emoji: r.emoji} as EmojiClickData, comment.id, 'comment', comment.user.id)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition ${r.hasReacted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                   <span>{r.emoji}</span> <span>{r.count}</span>
                                 </button>
                               ))}
                               <div className="relative">
                                 <button onClick={() => setActiveCommentEmojiPicker(prev => prev === comment.id ? null : comment.id)} className="reaction-trigger text-slate-400 hover:text-black p-1 transition"><SmilePlus className="w-3.5 h-3.5" /></button>
                                 {activeCommentEmojiPicker === comment.id && (
                                    <div className="absolute z-50 top-full mt-1 left-0 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
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