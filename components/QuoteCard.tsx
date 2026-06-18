'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { User, MessageCircle, Star, SmilePlus, Share2, Loader2 } from 'lucide-react'
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react'
import { toPng } from 'html-to-image'

export type GroupedReaction = { emoji: string, count: number, hasReacted: boolean }

export type FeedQuote = {
  id: string
  content: string
  created_at: string
  quoted_email: string | null
  custom_author_name: string | null
  publisher: { id: string, username: string } | null
  quoted_user: { username: string, avatar_url: string | null } | null
  template: { style_config: { gradient: string, baseColor: string } } | null
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
  if (len < 40) return 'text-4xl md:text-5xl'
  if (len < 80) return 'text-3xl md:text-4xl'
  if (len < 140) return 'text-2xl md:text-3xl'
  if (len < 200) return 'text-xl md:text-2xl'
  return 'text-lg md:text-xl'
}

export default function QuoteCard({ quote, isExpanded = false, onReact, onExpand, onFavorite }: QuoteCardProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  const pickerRef = useRef<HTMLDivElement>(null)
  const cardGraphicRef = useRef<HTMLDivElement>(null)

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

  const displayHandle = isRegisteredUser ? `@${targetName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : null
  const bgGradient = !quote.template ? 'from-slate-800 to-slate-900' : quote.template.style_config.gradient
  const targetAvatarUrl = quote.quoted_user?.avatar_url

  const handleReactionSelection = (emoji: EmojiClickData) => {
    setShowEmojiPicker(false)
    onReact(emoji, quote.id, 'quote', quote.publisher?.id)
  }

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!cardGraphicRef.current) return
    
    setIsExporting(true)
    try {
      const dataUrl = await toPng(cardGraphicRef.current, {
        quality: 1,
        pixelRatio: 2, 
        cacheBust: true,
      })

      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `pinquo-${targetName.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'PinQuo',
          text: `Check out this quote by ${targetName} on PinQuo!`,
          files: [file]
        })
      } else {
        const link = document.createElement('a')
        link.download = file.name
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      // ADDED: Explicit check to ignore user cancellation AbortError[cite: 9]
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      console.error('Failed to export image:', err)
      alert('Oops! Something went wrong while generating the image.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={`w-full flex flex-col bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 ${isExpanded ? 'p-0 pb-6 rounded-t-[40px]' : 'p-5 rounded-[40px]'}`}>
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

      <div 
        ref={cardGraphicRef}
        onClick={(e) => { e.stopPropagation(); if (!isExpanded && onExpand) onExpand(quote) }}
        className={`w-full bg-white rounded-[32px] overflow-hidden flex flex-col border border-slate-100 relative ${!isExpanded ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg' : 'shadow-sm'}`}
      >
        <div className="relative w-full h-48 shrink-0 pointer-events-none">
          <div className={`absolute inset-0 bg-linear-to-br ${bgGradient}`}></div>
          {!quote.template && targetAvatarUrl && <img src={targetAvatarUrl} alt="Bg" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover opacity-90" />}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
        </div>
        <div className="relative bg-white px-6 pb-8 pt-2 flex flex-col items-center text-center -mt-10 z-10 pointer-events-none">
          <div className="text-[70px] font-serif font-black text-black leading-none mb-1">“ ”</div>
          <p className={`font-medium text-black leading-snug whitespace-pre-wrap px-2 ${getQuoteFontSize(quote.content)}`}>{quote.content}</p>
          <div className="w-full mt-6 flex flex-col items-center">
            <div className="w-12 h-[2px] bg-black mb-3"></div>
            <p className={`text-xl font-medium tracking-wide ${(!isRegisteredUser && !quote.custom_author_name) ? 'text-slate-400 italic' : 'text-black'}`}>{targetName}</p>
            {displayHandle && <p className="text-slate-400 font-medium text-sm mt-0.5">{displayHandle}</p>}
          </div>
        </div>
      </div>

      <div className={`flex justify-between items-center mt-4 px-3 ${isExpanded ? 'px-6 border-b border-slate-50 pb-4' : ''}`}>
        <div className="flex items-center gap-2 flex-wrap">
          {quote.groupedReactions.map((r) => (
            <button 
              key={r.emoji} 
              onClick={(e) => { e.stopPropagation(); onReact({ emoji: r.emoji } as EmojiClickData, quote.id, 'quote', quote.publisher?.id) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors cursor-pointer ${
                r.hasReacted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}

          <div className="relative" ref={pickerRef}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker) }}
              className="reaction-trigger w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <SmilePlus className="w-4 h-4" />
            </button>

            {showEmojiPicker && (
              <div className="absolute z-50 bottom-full mb-2 left-0 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <EmojiPicker theme={Theme.LIGHT} onEmojiClick={handleReactionSelection} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <button onClick={handleExport} disabled={isExporting} title="Share Meme Card" className="hover:text-black hover:scale-110 active:scale-95 transition cursor-pointer disabled:opacity-50">
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
          </button>

          {!isExpanded && (
             <button onClick={(e) => { e.stopPropagation(); if (onExpand) onExpand(quote) }} title="Comments" className="flex items-center gap-1.5 hover:text-black hover:scale-110 active:scale-95 transition cursor-pointer">
               <MessageCircle className="w-5 h-5" />
               <span className="font-bold text-sm">{quote.commentCount}</span>
             </button>
          )}

          <button onClick={(e) => { e.stopPropagation(); onFavorite(quote.id) }} title="Favorite" className={`hover:scale-110 transition-transform active:scale-95 cursor-pointer ${quote.isFavorited ? 'text-yellow-400 fill-yellow-400' : 'hover:text-yellow-400'}`}>
            <Star className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}