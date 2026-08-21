'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { User, MessageCircle, Star, SmilePlus, Share2, Loader2 } from 'lucide-react'
import { EmojiClickData } from 'emoji-picker-react'
import CustomEmojiPicker from './CustomEmojiPicker'
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
const bgGradient = quote.template?.style_config?.gradient || 'from-slate-200 to-slate-300';
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
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
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

      {/* The Graphic */}
      <div 
        ref={cardGraphicRef}
        onClick={(e) => { e.stopPropagation(); if (!isExpanded && onExpand) onExpand(quote) }}
        className={`w-full bg-white rounded-[32px] overflow-hidden flex flex-col border border-slate-100 relative ${!isExpanded ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg' : 'shadow-sm'}`}
      >
        <div className={`relative w-full ${isExpanded ? 'h-12' : 'h-48'} shrink-0 pointer-events-none transition-all duration-300`}>
          
          {quote.template?.image_url && (
            <img src={quote.template.image_url} alt="Bg" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />
          )}

          {quote.template?.image_url && (
             <>
               <div className="absolute inset-0 bg-slate-900/30 mix-blend-multiply"></div>
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/10 to-black/60"></div>
             </>
          )}

          {!quote.template?.image_url && (
            <div className={`absolute inset-0 bg-linear-to-br ${bgGradient}`}></div>
          )}

          {!quote.template && targetAvatarUrl && (
            <div className="absolute inset-0 mix-blend-overlay">
              <img src={targetAvatarUrl} alt="Bg" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover opacity-80" />
            </div>
          )}

          <div className={`absolute bottom-0 left-0 w-full ${isExpanded ? 'h-12' : 'h-32'} bg-gradient-to-t from-white via-white/90 to-transparent`}></div>
        </div>
        
        <div className={`relative bg-white px-5 ${isExpanded ? 'pb-4 pt-0 -mt-2' : 'pb-8 pt-2 -mt-10'} flex flex-col items-center text-center z-10 pointer-events-none transition-all duration-300`}>
          
          <div className={`${isExpanded ? 'text-[36px] mb-0' : 'text-[70px] mb-1'} font-serif font-black text-slate-800 leading-none select-none`}>
            “ ”
          </div>
          
          <p className={`font-medium text-slate-900 leading-snug whitespace-pre-wrap px-2 ${isExpanded ? 'text-[17px]' : getQuoteFontSize(quote.content)}`}>
            {quote.content}
          </p>
          
          <div className={`w-full ${isExpanded ? 'mt-3' : 'mt-6'} flex flex-col items-center`}>
            <div className={`w-12 h-[3px] bg-slate-800 rounded-full ${isExpanded ? 'mb-1.5' : 'mb-3'}`}></div>
            <p className={`${isExpanded ? 'text-base' : 'text-lg'} font-bold tracking-wide ${(!isRegisteredUser && !quote.custom_author_name) ? 'text-slate-400 italic font-medium' : 'text-slate-900'}`}>
              {targetName}
            </p>
            {displayHandle && !isExpanded && (
              <p className="text-slate-400 font-medium text-xs mt-0.5">{displayHandle}</p>
            )}
          </div>
        </div>
      </div>

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

      {/* RESTORED ACTION BAR (Fixes the Unused Variables Error!) */}
      {!isExpanded && (
        <div className="flex items-center justify-between mt-3 px-2">
          <div className="flex items-center gap-1">
            {/* Favorite Button */}
            <button onClick={(e) => { e.stopPropagation(); onFavorite(quote.id); }} className="p-2 hover:bg-slate-50 rounded-full transition group">
              <Star className={`w-5 h-5 transition-colors ${quote.isFavorited ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400 group-hover:text-yellow-400'}`} />
            </button>
            
            {/* Emoji Reaction Picker */}
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

          {/* Export Button */}
          <button onClick={handleExport} disabled={isExporting} className="p-2 hover:bg-slate-50 rounded-full transition group disabled:opacity-50">
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <Share2 className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />}
          </button>
        </div>
      )}
    </div>
  )}