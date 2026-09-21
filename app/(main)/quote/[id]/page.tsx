'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QuoteCard, { FeedQuote, EmojiClickData, GroupedReaction } from '@/components/QuoteCard'
import { Loader2, ArrowLeft, Send, SmilePlus, User } from 'lucide-react'
import { useQuoteInteractions, QuoteComment } from '@/hooks/useQuoteInteractions'
import CustomEmojiPicker from '@/components/CustomEmojiPicker'

const timeAgo = (dateString: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default function SingleQuotePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const quoteId = typeof params?.id === 'string' ? params.id : ''
  
  const [quote, setQuote] = useState<FeedQuote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  const [comments, setComments] = useState<QuoteComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [activeCommentEmojiPicker, setActiveCommentEmojiPicker] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const { fetchComments, handleReaction, postComment, toggleFavorite } = useQuoteInteractions({
    supabase,
    currentUserId,
    quotes: quote ? [quote] : [],
    setQuotes: () => {}, 
    expandedQuote: quote,
    setExpandedQuote: setQuote,
    comments,
    setComments,
  })

  useEffect(() => {
    if (!quoteId) return

    const fetchQuote = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || null
      setCurrentUserId(userId)

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
          quote_witnesses(id, witness_user_id, witness_email, vote, profile:profiles(username, avatar_url))
        `)
        .eq('id', quoteId)
        .single()

      if (error || !data) {
        setIsLoading(false)
        return
      }

      const quoteReacts = (data.reactions || []).filter((r: any) => r.comment_id === null)
      const reactMap: Record<string, GroupedReaction> = {}
      
      quoteReacts.forEach((r: any) => {
        if (!reactMap[r.reaction_type]) reactMap[r.reaction_type] = { emoji: r.reaction_type, count: 0, hasReacted: false }
        reactMap[r.reaction_type].count++
        if (userId && r.user_id === userId) reactMap[r.reaction_type].hasReacted = true
      })

      const isFavorited = Array.isArray(data.favorites) && data.favorites.some((f: any) => f.user_id === userId)

      const formattedQuote: FeedQuote = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        quoted_email: data.quoted_email,
        custom_author_name: data.custom_author_name,
        live_photo_url: data.live_photo_url,
        publisher: data.publisher as any,
        quoted_user: data.quoted_user as any,
        template: data.template as any,
        groupedReactions: Object.values(reactMap).sort((a, b) => b.count - a.count),
        commentCount: Array.isArray(data.comments) && data.comments[0] ? (data.comments[0] as any).count : 0,
        favoriteCount: Array.isArray(data.favorites) ? data.favorites.length : 0,
        isFavorited,
        witnesses: Array.isArray(data.quote_witnesses) ? data.quote_witnesses : []
      }

      setQuote(formattedQuote)
      setIsLoading(false)
    }

    fetchQuote()
  }, [quoteId, supabase])

  useEffect(() => {
    if (quote?.id) fetchComments(quote.id)
  }, [quote?.id, fetchComments])

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isPostingComment) return
    setIsPostingComment(true)
    await postComment(newComment.trim())
    setNewComment('')
    setIsPostingComment(false)
  }

  const handleVoteWitness = async (quoteId: string, voteType: 'approved' | 'denied') => {
    if (!currentUserId || !quote) return
    const witnesses = [...(quote.witnesses || [])]
    const witness = witnesses.find(w => w.witness_user_id === currentUserId)
    if (witness) witness.vote = voteType
    setQuote({ ...quote, witnesses })
    await supabase.from('quote_witnesses').update({ vote: voteType }).match({ quote_id: quoteId, witness_user_id: currentUserId })
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center dark:bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-slate-300 dark:text-slate-700" /></div>
  }

  if (!quote) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center dark:bg-slate-950">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Citatet hittades inte</h2>
        <button onClick={() => router.push('/feed')} className="mt-4 px-6 py-3 bg-black text-white dark:bg-white dark:text-slate-950 font-bold rounded-full">Gå till flödet</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-50 dark:bg-slate-950 pt-6 px-4 pb-24 overflow-x-hidden">
      
      {/* Tillbaka-knapp */}
      <div className="w-full max-w-[550px] mx-auto mb-4 flex items-center">
        <button title="Tillbaka" onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full transition">
          <ArrowLeft className="w-7 h-7 text-black dark:text-slate-100" />
        </button>
      </div>

      {/* 💥 ALLT I EN OCH SAMMA CONTAINER - PRECIS SOM I BILD 3b53e6 */}
      <div className="w-full max-w-[550px] mx-auto bg-white dark:bg-slate-900 sm:rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col mb-12">
        
        {/* Själva citatkortet */}
        <div className="shrink-0 z-10">
          <QuoteCard 
            quote={quote} 
            isExpanded={true} 
            onReact={handleReaction} 
            onFavorite={toggleFavorite}
            onVoteWitness={handleVoteWitness}
          />
        </div>

        {/* Kommentarer direkt integrerat nedanför */}
        <div className="flex-1 px-4 sm:px-6 py-4 space-y-6 bg-slate-50 dark:bg-slate-900/50">
          {comments.length === 0 ? (
            <div className="text-center dark:text-slate-400 text-slate-400 font-medium py-6">Inga kommentarer än. Bli den första!</div>
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
                  <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0 border dark:border-slate-700 overflow-hidden flex items-center justify-center mt-0.5">
                    {comment.user.avatar_url ? <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover"/> : <User className="w-5 h-5 text-slate-400"/>}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                      <div className="text-[14px] sm:text-[15px] leading-snug text-slate-800 dark:text-slate-200 break-words">
                        <span className="font-bold text-slate-900 dark:text-white mr-2">{comment.user.username}</span>
                        {comment.content}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1.5">
                        <span className="text-[12px] text-slate-400 font-medium">{timeAgo(comment.created_at)}</span>
                        <div className="flex items-center gap-1.5">
                          {groupedCommentReacts.map(r => (
                            <button key={r.emoji} onClick={() => { setActiveCommentEmojiPicker(null); handleReaction({emoji: r.emoji} as EmojiClickData, comment.id, 'comment', comment.user.id) }} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold transition ${r.hasReacted ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                              <span>{r.emoji}</span> <span>{r.count}</span>
                            </button>
                          ))}
                          <div className="relative">
                            <button onClick={() => setActiveCommentEmojiPicker(prev => prev === comment.id ? null : comment.id)} className="text-slate-400 hover:text-black dark:hover:text-white transition flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                              <SmilePlus className="w-3.5 h-3.5" />
                            </button>
                            {activeCommentEmojiPicker === comment.id && (
                              <div className="absolute z-50 top-full mt-1 left-0 shadow-xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 border border-slate-100 dark:border-slate-800">
                                <CustomEmojiPicker onEmojiClick={(e) => { setActiveCommentEmojiPicker(null); handleReaction(e, comment.id, 'comment', comment.user.id) }} />
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

        {/* Inmatningsfältet fäst direkt i kortets botten */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="relative flex items-center">
            <input 
              ref={commentInputRef}
              type="text" 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
              placeholder="Lägg till kommentar..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 border border-transparent text-slate-900 dark:text-slate-100 rounded-full py-3 pl-5 pr-14 text-[15px] font-medium focus:border-emerald-300 dark:focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition outline-none placeholder:text-slate-500"
            />
            <button 
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isPostingComment}
              className="absolute right-1.5 p-2 bg-black dark:bg-emerald-600 text-white rounded-full hover:scale-105 active:scale-95 disabled:opacity-0 disabled:scale-50 transition-all duration-200"
            >
              {isPostingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}