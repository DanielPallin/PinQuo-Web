'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { User, MessageCircle, Bookmark, SmilePlus, Share2 } from 'lucide-react'
import { EmojiClickData } from 'emoji-picker-react'
import CustomEmojiPicker from './CustomEmojiPicker'

export type GroupedReaction = { emoji: string, count: number, hasReacted: boolean }

export type FeedQuote = {
  id: string
  content: string
  created_at: string
  quoted_email: string | null
  custom_author_name: string | null
  publisher: { id: string, username: string, avatar_url: string | null } | null
  quoted_user: { id: string, username: string, avatar_url: string | null } | null
  template: { 
    style_config: { gradient?: string; baseColor?: string }; 
    image_url: string | null 
  } | null
  groupedReactions: GroupedReaction[]
  commentCount: number
  favoriteCount: number
  isFavorited: boolean
}

interface QuoteCardProps {
  quote: FeedQuote
  isExpanded?: boolean
  onReact: (emoji: EmojiClickData, quoteId: string, type: 'quote', publisherId?: string) => void
  onExpand?: (quote: FeedQuote) => void
  onFavorite: (quoteId: string) => void
}

const getQuoteFontSize = (text: string) => {
  const len = text.length
  if (len < 40) return 'text-3xl md:text-4xl'
  if (len < 80) return 'text-2xl md:text-3xl'
  if (len < 140) return 'text-xl md:text-2xl'
  if (len < 200) return 'text-lg md:text-xl'
  return 'text-base md:text-lg'
}

export default function QuoteCard({ quote, isExpanded = false, onReact, onExpand, onFavorite }: QuoteCardProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  // Optimistic UI State for Favorites
  const [isFav, setIsFav] = useState(quote.isFavorited)
  const [favCount, setFavCount] = useState(quote.favoriteCount)

  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsFav(quote.isFavorited)
    setFavCount(quote.favoriteCount)
  }, [quote.isFavorited, quote.favoriteCount])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const publisherName = quote.publisher?.username || 'Unknown'
  const isRegisteredUser = !!quote.quoted_user?.username
  
  let targetName = 'Unknown'
  if (quote.custom_author_name && quote.custom_author_name.trim() !== '') {
    targetName = quote.custom_author_name
  } else if (isRegisteredUser && quote.quoted_user?.username) {
    targetName = quote.quoted_user.username
  } else if (quote.quoted_email && quote.quoted_email.trim() !== '') {
    targetName = 'Pending Invite'
  }

  const bgGradient = quote.template?.style_config?.gradient || 'from-slate-800 to-slate-900'
  const targetAvatarUrl = quote.quoted_user?.avatar_url

  const cleanQuoteContent = quote.content.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim()

  const handleReactionSelection = (emoji: EmojiClickData) => {
    setShowEmojiPicker(false)
    onReact(emoji, quote.id, 'quote', quote.publisher?.id)
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFav(!isFav)
    setFavCount(prev => isFav ? prev - 1 : prev + 1)
    onFavorite(quote.id) 
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const quoteUrl = `${window.location.origin}/quote/${quote.id}`
    if (navigator.share) {
      try { await navigator.share({ title: 'PinQuo', text: `Check out this quote by ${targetName} on PinQuo!`, url: quoteUrl }) } 
      catch (err) { /* User dismissed */ }
    } else {
      try {
        await navigator.clipboard.writeText(quoteUrl)
        alert('Link copied to clipboard!')
      } catch (err) { console.error('Failed to copy URL:', err) }
    }
  }

  return (
    <div className={`w-full flex flex-col bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 ${isExpanded ? 'p-0 pb-6 rounded-t-[40px]' : 'p-5 rounded-[40px]'}`}>
      
      {/* Publisher Header */}
      <div className={`flex items-center justify-between mb-4 px-2 ${isExpanded ? 'pt-6 px-6' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href={`/${publisherName}`} className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 shrink-0">
            {quote.publisher?.avatar_url ? (
              <img src={quote.publisher.avatar_url} alt={publisherName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-slate-400" />
            )}
          </Link>
          <p className="text-slate-500 font-medium text-sm">
            Published by <Link href={`/${publisherName}`} className="font-bold text-slate-800 hover:text-black hover:underline">{publisherName}</Link>
          </p>
        </div>
      </div>

      {/* FULL-BLEED CINEMATIC GRAPHIC */}
      <div 
        onClick={(e) => { e.stopPropagation(); if (!isExpanded && onExpand) onExpand(quote) }}
        className={`w-full bg-slate-900 rounded-[32px] overflow-hidden flex flex-col relative ${!isExpanded ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg aspect-square will-change-transform' : 'shadow-none aspect-square sm:aspect-auto sm:min-h-[400px]'}`}
      >
        <img src="/PinQuote-Logo.png" alt="PinQuo" className="absolute top-5 left-5 h-5 sm:h-6 w-auto opacity-60 drop-shadow-md z-20 pointer-events-none select-none"/>

        {quote.template?.image_url ? (
          <img src={quote.template.image_url} alt="Quote Background" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'contrast(1.15) saturate(1.2) sepia(0.15) brightness(0.85)' }} />
        ) : (
          <div className={`absolute inset-0 bg-linear-to-br ${bgGradient}`}></div>
        )}

        {!quote.template && targetAvatarUrl && (
          <div className="absolute inset-0 mix-blend-overlay opacity-80">
            <img src={targetAvatarUrl} alt="Bg" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 mix-blend-multiply pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 sm:p-10 text-center pointer-events-none select-none">
          <div className="relative inline-block max-w-[75%] mx-auto mt-4">
            <span className="absolute top-0 left-0 -translate-x-[110%] -translate-y-[40%] text-5xl sm:text-7xl font-serif font-black text-white/50 drop-shadow-lg leading-none pointer-events-none select-none">&ldquo;</span>
            <p className={`font-black text-white leading-snug whitespace-pre-wrap relative z-10 ${getQuoteFontSize(cleanQuoteContent)}`} style={{ textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,1)' }}>
              {cleanQuoteContent}
            </p>
            <span className="absolute bottom-0 right-0 translate-x-[110%] translate-y-[30%] text-5xl sm:text-7xl font-serif font-black text-white/50 drop-shadow-lg leading-none pointer-events-none select-none">&rdquo;</span>
          </div>
          
          <div className="mt-8 sm:mt-10 flex flex-col items-center relative z-10">
            <p className={`font-bold tracking-wide text-lg text-white/90 ${(!isRegisteredUser && !quote.custom_author_name) ? 'italic font-medium' : ''}`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)' }}>
              &mdash; {targetName}
            </p>
          </div>
        </div>
      </div>

      {/* RENDER THE ACTIVE EMOJIS */}
      {quote.groupedReactions && quote.groupedReactions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 px-2">
          {quote.groupedReactions.map((reaction, idx) => (
            <button
              key={`${reaction.emoji}-${idx}`}
              onClick={(e) => { e.stopPropagation(); onReact({ emoji: reaction.emoji } as EmojiClickData, quote.id, 'quote', quote.publisher?.id); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                reaction.hasReacted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm">{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* NEW MODERN ACTION BAR */}
      {!isExpanded && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 px-2">
          
          <div className="flex items-center gap-5">
            {/* React */}
            <div className="relative" ref={pickerRef}>
              <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }} className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-500 transition-colors group">
                <SmilePlus className="w-6 h-6 group-active:scale-95 transition-transform" />
              </button>
              {showEmojiPicker && (
                <div className="absolute z-50 bottom-full left-0 mb-2 shadow-xl rounded-2xl overflow-hidden border border-slate-100 bg-white">
                  <CustomEmojiPicker onEmojiClick={handleReactionSelection} />
                </div>
              )}
            </div>

            {/* Comment */}
            <button onClick={(e) => { e.stopPropagation(); if (onExpand) onExpand(quote); }} className="flex items-center gap-1.5 text-slate-500 hover:text-blue-500 transition-colors group">
              <MessageCircle className="w-6 h-6 group-active:scale-95 transition-transform" />
              {quote.commentCount > 0 && <span className="text-sm font-bold mt-0.5">{quote.commentCount}</span>}
            </button>

            {/* Save/Favorite */}
            <button onClick={handleFavoriteClick} className={`flex items-center gap-1.5 transition-colors group ${isFav ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}>
              <Bookmark className={`w-6 h-6 group-active:scale-95 transition-transform ${isFav ? 'fill-amber-500' : ''}`} />
              {favCount > 0 && <span className={`text-sm font-bold mt-0.5 ${isFav ? 'text-amber-500' : ''}`}>{favCount}</span>}
            </button>
          </div>

          {/* Share */}
          <button onClick={handleShare} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors group">
            <Share2 className="w-6 h-6 group-active:scale-95 transition-transform" />
          </button>
          
        </div>
      )}
    </div>
  )
}