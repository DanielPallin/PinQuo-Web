'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { User, MessageCircle, Star, SmilePlus, Share2 } from 'lucide-react'
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
    style_config: { 
      gradient?: string; 
      baseColor?: string 
    }; 
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

  // Keep state in sync if the parent data changes
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
  
  let targetName = 'Unknown';
  if (quote.custom_author_name && quote.custom_author_name.trim() !== '') {
    targetName = quote.custom_author_name;
  } else if (isRegisteredUser && quote.quoted_user?.username) {
    targetName = quote.quoted_user.username;
  } else if (quote.quoted_email && quote.quoted_email.trim() !== '') {
    targetName = 'Pending Invite';
  }

  const bgGradient = quote.template?.style_config?.gradient || 'from-slate-800 to-slate-900';
  const targetAvatarUrl = quote.quoted_user?.avatar_url

  // The Sanitizer (Strips manual quotes and hidden newlines)
  const cleanQuoteContent = quote.content
    .replace(/^["'“”«»]+|["'“”«»]+$/g, '')
    .trim()

  const handleReactionSelection = (emoji: EmojiClickData) => {
    setShowEmojiPicker(false)
    onReact(emoji, quote.id, 'quote', quote.publisher?.id)
  }

  // Optimistic Favorite Handler
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFav(!isFav)
    setFavCount(prev => isFav ? prev - 1 : prev + 1)
    onFavorite(quote.id) // Still fires to the DB in the background
  }

  // Native URL Sharing Handler
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const quoteUrl = `${window.location.origin}/quote/${quote.id}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PinQuo',
          text: `Check out this quote by ${targetName} on PinQuo!`,
          url: quoteUrl
        })
      } catch (err) {
        // User likely dismissed the share sheet
      }
    } else {
      // Fallback for Desktop/Unsupported browsers
      try {
        await navigator.clipboard.writeText(quoteUrl)
        alert('Link copied to clipboard!')
      } catch (err) {
        console.error('Failed to copy URL:', err)
      }
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
        className={`w-full bg-slate-900 rounded-[32px] overflow-hidden flex flex-col relative ${!isExpanded ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg aspect-square' : 'shadow-none aspect-square sm:aspect-auto sm:min-h-[400px]'}`}
      >
        
        {/* The Watermark Logo */}
        <img 
          src="/PinQuote-Logo.png" 
          alt="PinQuo" 
          className="absolute top-5 left-5 h-5 sm:h-6 w-auto opacity-60 drop-shadow-md z-20 pointer-events-none select-none"
        />

        {/* Base Image with Filters */}
        {quote.template?.image_url ? (
          <img 
            src={quote.template.image_url} 
            alt="Quote Background" 
            crossOrigin="anonymous" 
            className="absolute inset-0 w-full h-full object-cover" 
            style={{ filter: 'contrast(1.15) saturate(1.2) sepia(0.15) brightness(0.85)' }}
          />
        ) : (
          <div className={`absolute inset-0 bg-linear-to-br ${bgGradient}`}></div>
        )}

        {/* Avatar Mode Fallback */}
        {!quote.template && targetAvatarUrl && (
          <div className="absolute inset-0 mix-blend-overlay opacity-80">
            <img src={targetAvatarUrl} alt="Bg" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}

        {/* Cinematic Vignettes */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 mix-blend-multiply pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 sm:p-10 text-center pointer-events-none select-none">
          
          {/* THE "INVISIBLE RECTANGLE" WRAPPER */}
          {/* Reduced max-w to 75% so the quotes have room to hang outside without clipping the edges */}
          <div className="relative inline-block max-w-[75%] mx-auto mt-4">
            
            {/* Top-Left Floating Quote (Using Transforms) */}
            <span className="absolute top-0 left-0 -translate-x-[110%] -translate-y-[40%] text-5xl sm:text-7xl font-serif font-black text-white/50 drop-shadow-lg leading-none pointer-events-none select-none">
              &ldquo;
            </span>
            
            <p 
              className={`font-black text-white leading-snug whitespace-pre-wrap relative z-10 ${getQuoteFontSize(cleanQuoteContent)}`}
              style={{ textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,1)' }}
            >
              {cleanQuoteContent}
            </p>

            {/* Bottom-Right Floating Quote (Using Transforms) */}
            <span className="absolute bottom-0 right-0 translate-x-[110%] translate-y-[30%] text-5xl sm:text-7xl font-serif font-black text-white/50 drop-shadow-lg leading-none pointer-events-none select-none">
              &rdquo;
            </span>
          </div>
          
          <div className="mt-8 sm:mt-10 flex flex-col items-center relative z-10">
            <p 
              className={`font-bold tracking-wide text-lg text-white/90 ${(!isRegisteredUser && !quote.custom_author_name) ? 'italic font-medium' : ''}`}
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)' }}
            >
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
                reaction.hasReacted 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm">{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Integrated Quick Comment Bar */}
      {!isExpanded && (
        <div 
          onClick={(e) => { e.stopPropagation(); if (onExpand) onExpand(quote); }}
          className="mt-4 flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-full cursor-text hover:bg-slate-100 transition-colors group"
        >
          <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
             <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <span className="text-[14px] text-slate-400 font-medium group-hover:text-slate-500 transition-colors">
             comment...
          </span>
        </div>
      )}

      {/* Action Bar */}
      {!isExpanded && (
        <div className="flex items-center justify-between mt-3 px-2">
          <div className="flex items-center gap-1">
            
            {/* The Optimistic Favorite Button */}
            <button onClick={handleFavoriteClick} className="flex items-center gap-1.5 p-2 hover:bg-slate-50 rounded-full transition group">
              <Star className={`w-5 h-5 transition-colors ${isFav ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400 group-hover:text-yellow-400'}`} />
              {favCount > 0 && <span className={`text-xs font-bold ${isFav ? 'text-yellow-500' : 'text-slate-400'}`}>{favCount}</span>}
            </button>
            
            <div className="relative" ref={pickerRef}>
              <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }} className="p-2 hover:bg-slate-50 rounded-full transition group">
                <SmilePlus className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
              </button>
              {showEmojiPicker && (
                <div className="absolute z-50 bottom-full left-0 mb-2 shadow-xl rounded-2xl overflow-hidden border border-slate-100 bg-white">
                  <CustomEmojiPicker onEmojiClick={handleReactionSelection} />
                </div>
              )}
            </div>
          </div>

          <button onClick={handleShare} className="p-2 hover:bg-slate-50 rounded-full transition group">
            <Share2 className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
          </button>
        </div>
      )}
    </div>
  )
}