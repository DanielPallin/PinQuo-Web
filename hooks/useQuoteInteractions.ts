'use client'

// Shared reaction / comment / favorite logic used by every page that renders
// a QuoteCard + comment thread (Feed, Favourites, Quoted-In, Published).
// Centralising this fixes two things that had drifted across pages:
//  1. Comment reactions weren't consistently checked for "already reacted"
//     (some pages would just re-insert instead of toggling off).
//  2. Notifications on react/comment were inconsistent - some pages sent
//     them, some didn't. This hook always notifies the owner unless the
//     actor is acting on their own content.

import { useCallback, useState } from 'react'
import type { EmojiClickData } from 'emoji-picker-react'
import type { createClient } from '@/lib/supabase/client'
import type { FeedQuote } from '@/components/QuoteCard'

// Shared shape for a comment + its reactions, used by every page that
// renders a comment thread inside the expanded-quote modal.
export type QuoteComment = {
  id: string
  content: string
  created_at: string
  user: { id: string; username: string; avatar_url: string | null }
  reactions: { reaction_type: string; user_id: string }[]
}

type SupabaseClientType = ReturnType<typeof createClient>

interface UseQuoteInteractionsOptions {
  supabase: SupabaseClientType
  currentUserId: string | null
  quotes: FeedQuote[]
  setQuotes: React.Dispatch<React.SetStateAction<FeedQuote[]>>
  expandedQuote: FeedQuote | null
  setExpandedQuote: React.Dispatch<React.SetStateAction<FeedQuote | null>>
  comments: QuoteComment[]
  setComments: React.Dispatch<React.SetStateAction<QuoteComment[]>>
  /**
   * When true, un-favoriting a quote removes it from `quotes` entirely
   * instead of just flipping `isFavorited`. Used on the Favourites page,
   * where every card shown is - by definition - currently favorited.
   */
  removeOnUnfavorite?: boolean
}

export function useQuoteInteractions({
  supabase,
  currentUserId,
  quotes,
  setQuotes,
  expandedQuote,
  setExpandedQuote,
  comments,
  setComments,
  removeOnUnfavorite = false,
}: UseQuoteInteractionsOptions) {
  const [isPostingComment, setIsPostingComment] = useState(false)

  // Fetch (or refresh) the comment thread for a given quote.
  const fetchComments = useCallback(async (quoteId: string) => {
    const { data } = await supabase
      .from('comments')
      .select(`
        id, content, created_at,
        user:profiles!comments_user_id_fkey(id, username, avatar_url),
        reactions(reaction_type, user_id)
      `)
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: true })

    if (data) setComments(data as unknown as QuoteComment[])
  }, [supabase, setComments])

  // Toggle a reaction on a quote or a comment, with an optimistic UI update.
  // A user can have multiple different reaction emojis on the same target;
  // clicking an emoji they've already used removes just that one.
  const handleReaction = useCallback(async (
    emojiObj: EmojiClickData,
    targetId: string,
    type: 'quote' | 'comment',
    targetOwnerId?: string
  ) => {
    if (!currentUserId) return
    const emoji = emojiObj.emoji

    // Work out add vs remove for BOTH quotes and comments (previously some
    // pages only checked this for quotes, so comment reactions could never
    // toggle off correctly).
    let isRemoving = false
    if (type === 'quote') {
      const quote = quotes.find(q => q.id === targetId) || (expandedQuote?.id === targetId ? expandedQuote : undefined)
      isRemoving = quote?.groupedReactions.find(r => r.emoji === emoji)?.hasReacted || false
    } else {
      const comment = comments.find(c => c.id === targetId)
      isRemoving = comment?.reactions.some(r => r.reaction_type === emoji && r.user_id === currentUserId) || false
    }

    // Optimistic UI update
    if (type === 'quote') {
      const updateQuoteState = (q: FeedQuote): FeedQuote => {
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
        return { ...q, groupedReactions: newReactions.sort((a, b) => b.count - a.count) }
      }

      setQuotes(prev => prev.map(q => q.id === targetId ? updateQuoteState(q) : q))
      if (expandedQuote?.id === targetId) setExpandedQuote(updateQuoteState(expandedQuote))
    } else {
      setComments(prev => prev.map(c => {
        if (c.id !== targetId) return c
        const newReactions = isRemoving
          ? c.reactions.filter(r => !(r.reaction_type === emoji && r.user_id === currentUserId))
          : [...c.reactions, { reaction_type: emoji, user_id: currentUserId }]
        return { ...c, reactions: newReactions }
      }))
    }

    // Persist to Supabase
    if (isRemoving) {
      if (type === 'quote') {
        await supabase.from('reactions').delete().match({ quote_id: targetId, user_id: currentUserId, reaction_type: emoji })
      } else {
        await supabase.from('reactions').delete().match({ comment_id: targetId, user_id: currentUserId, reaction_type: emoji })
      }
    } else {
      type ReactionPayload = { user_id: string; reaction_type: string; quote_id?: string; comment_id?: string }
      const insertData: ReactionPayload = type === 'quote'
        ? { quote_id: targetId, user_id: currentUserId, reaction_type: emoji }
        : { comment_id: targetId, user_id: currentUserId, reaction_type: emoji }

      await supabase.from('reactions').insert(insertData as any)

      // Notify the owner, unless the user is reacting to their own content
      if (targetOwnerId && targetOwnerId !== currentUserId) {
        await supabase.from('notifications').insert({
          receiver_id: targetOwnerId,
          actor_id: currentUserId,
          type: 'reaction',
          quote_id: type === 'quote' ? targetId : (expandedQuote?.id ?? null)
        })
      }
    }

    // Comment reaction lists aren't tracked with per-emoji counts locally,
    // so re-fetch to stay in sync with the DB after reacting to a comment.
    if (type === 'comment' && expandedQuote) {
      await fetchComments(expandedQuote.id)
    }
  }, [currentUserId, quotes, comments, expandedQuote, supabase, setQuotes, setExpandedQuote, setComments, fetchComments])

  // Post a new top-level comment on the currently expanded quote.
  const postComment = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !expandedQuote || !currentUserId) return

    setIsPostingComment(true)
    try {
      const { data } = await supabase
        .from('comments')
        .insert({ quote_id: expandedQuote.id, user_id: currentUserId, content: trimmed })
        .select('id, content, created_at, user:profiles(id, username, avatar_url), reactions(reaction_type, user_id)')
        .single()

      if (data) {
        const newComment = data as unknown as QuoteComment
        setComments(prev => [...prev, newComment])
        setQuotes(prev => prev.map(q => q.id === expandedQuote.id ? { ...q, commentCount: q.commentCount + 1 } : q))
        setExpandedQuote(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null)

        // Notify the publisher, unless commenting on your own quote
        if (expandedQuote.publisher && expandedQuote.publisher.id !== currentUserId) {
          await supabase.from('notifications').insert({
            receiver_id: expandedQuote.publisher.id,
            actor_id: currentUserId,
            type: 'comment',
            quote_id: expandedQuote.id
          })
        }
      }
    } finally {
      setIsPostingComment(false)
    }
  }, [expandedQuote, currentUserId, supabase, setComments, setQuotes, setExpandedQuote])

  // Toggle a quote's favorited state.
  const toggleFavorite = useCallback(async (quoteId: string) => {
    if (!currentUserId) return
    const quote = quotes.find(q => q.id === quoteId) || (expandedQuote?.id === quoteId ? expandedQuote : null)
    if (!quote) return

    const isAdding = !quote.isFavorited

    if (removeOnUnfavorite && !isAdding) {
      // Favourites page: unfavoriting removes the card entirely
      setQuotes(prev => prev.filter(q => q.id !== quoteId))
      if (expandedQuote?.id === quoteId) setExpandedQuote(null)
    } else {
      const updateQuoteState = (q: FeedQuote): FeedQuote => ({
        ...q,
        favoriteCount: q.favoriteCount + (isAdding ? 1 : -1),
        isFavorited: isAdding
      })
      setQuotes(prev => prev.map(q => q.id === quoteId ? updateQuoteState(q) : q))
      if (expandedQuote?.id === quoteId) setExpandedQuote(updateQuoteState(expandedQuote))
    }

    if (isAdding) {
      await supabase.from('favorites').insert({ quote_id: quoteId, user_id: currentUserId })
    } else {
      await supabase.from('favorites').delete().match({ quote_id: quoteId, user_id: currentUserId })
    }
  }, [currentUserId, quotes, expandedQuote, supabase, setQuotes, setExpandedQuote, removeOnUnfavorite])

  return {
    fetchComments,
    handleReaction,
    postComment,
    toggleFavorite,
    isPostingComment,
  }
}