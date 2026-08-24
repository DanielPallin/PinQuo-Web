'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, MessageCircle, Bookmark, SmilePlus, Share2, Loader2, X, Mail } from 'lucide-react'
import { EmojiClickData } from 'emoji-picker-react'
import CustomEmojiPicker from './CustomEmojiPicker'
import { createClient } from '@/lib/supabase/client'

export type GroupedReaction = { emoji: string, count: number, hasReacted: boolean }

export type WitnessRecord = {
  id: string
  witness_user_id: string | null
  witness_email: string | null
  vote: 'pending' | 'approved' | 'denied'
  profile?: { username?: string; avatar_url?: string | null } | null 
}

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
  witnesses?: WitnessRecord[]
}

interface QuoteCardProps {
  quote: FeedQuote
  isExpanded?: boolean
  onReact: (emoji: EmojiClickData, quoteId: string, type: 'quote', publisherId?: string) => void
  onExpand?: (quote: FeedQuote) => void
  onFavorite: (quoteId: string) => void
  onVoteWitness?: (quoteId: string, vote: 'approved' | 'denied') => void
}

const getQuoteFontSize = (text: string) => {
  const len = text.length
  if (len < 40) return 'text-3xl md:text-4xl'
  if (len < 80) return 'text-2xl md:text-3xl'
  if (len < 140) return 'text-xl md:text-2xl'
  if (len < 200) return 'text-lg md:text-xl'
  return 'text-base md:text-lg'
}

export default function QuoteCard({ quote, isExpanded = false, onReact, onExpand, onFavorite, onVoteWitness }: QuoteCardProps) {
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  
  const [isFav, setIsFav] = useState(quote.isFavorited)
  const [favCount, setFavCount] = useState(quote.favoriteCount)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Modals
  const [showWitnessModal, setShowWitnessModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  
  // 💥 NEW: State to store dynamically fetched witness profiles
  const [witnessProfiles, setWitnessProfiles] = useState<Record<string, { username: string; avatar_url: string | null }>>({})
  
  // Auth State
  const [isGuest, setIsGuest] = useState(true)
  const [isLogin, setIsLogin] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isEmailSent, setIsEmailSent] = useState(false)

  // 1. Auth Setup
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsGuest(!data.session)
      if (data.session?.user) {
        setCurrentUserId(data.session.user.id)
      }
    }
    fetchSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. State Sync
  useEffect(() => {
    Promise.resolve().then(() => {
      setIsFav(prev => prev !== quote.isFavorited ? quote.isFavorited : prev)
      setFavCount(prev => prev !== quote.favoriteCount ? quote.favoriteCount : prev)
    })
  }, [quote.isFavorited, quote.favoriteCount])

  // 3. Click Outside Logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 💥 NEW: Fetch missing witness profiles when the modal opens
  useEffect(() => {
    if (showWitnessModal && quote.witnesses && quote.witnesses.length > 0) {
      const fetchMissingProfiles = async () => {
        // Find witnesses that have an ID, but no profile data passed down from parent
        const missingUserIds = quote.witnesses!
          .filter(w => w.witness_user_id && !w.profile && !witnessProfiles[w.witness_user_id])
          .map(w => w.witness_user_id as string)

        if (missingUserIds.length === 0) return

        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', missingUserIds)

        if (data && !error) {
          const profileMap = data.reduce((acc, p) => {
            acc[p.id] = { username: p.username, avatar_url: p.avatar_url }
            return acc
          }, {} as Record<string, { username: string; avatar_url: string | null }>)
          
          setWitnessProfiles(prev => ({ ...prev, ...profileMap }))
        }
      }
      
      fetchMissingProfiles()
    }
  }, [showWitnessModal, quote.witnesses, supabase, witnessProfiles])

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

  const witnesses = quote.witnesses || []
  const approvedCount = witnesses.filter(w => w.vote === 'approved').length
  const deniedCount = witnesses.filter(w => w.vote === 'denied').length
  const totalWitnesses = witnesses.length

  const userWitnessEntry = witnesses.find(w => w.witness_user_id === currentUserId)
  const isUserWitness = !!userWitnessEntry

  const handleWitnessVoteAction = async (e: React.MouseEvent, voteType: 'approved' | 'denied') => {
    e.stopPropagation()
    if (isGuest) {
      setShowAuthModal(true)
      return
    }
    if (onVoteWitness) onVoteWitness(quote.id, voteType)
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isGuest) {
      setShowAuthModal(true)
      return
    }
    setIsFav(!isFav)
    setFavCount(prev => isFav ? prev - 1 : prev + 1)
    onFavorite(quote.id) 
  }

  const handleReactClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isGuest) {
      setShowAuthModal(true)
      return
    }
    setShowEmojiPicker(!showEmojiPicker)
  }

  const handleReactionSelection = (emoji: EmojiClickData) => {
    setShowEmojiPicker(false)
    if (isGuest) return 
    onReact(emoji, quote.id, 'quote', quote.publisher?.id)
  }

  const handleExistingReactionClick = (e: React.MouseEvent, emoji: string) => {
    e.stopPropagation()
    if (isGuest) {
      setShowAuthModal(true)
      return
    }
    onReact({ emoji } as EmojiClickData, quote.id, 'quote', quote.publisher?.id)
  }

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isGuest) {
      setShowAuthModal(true)
      return
    }
    if (onExpand) onExpand(quote)
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

  const handleInContextAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    
    let authSuccess = false

    if (!isLogin) {
      const sanitizedUsername = authUsername.trim().toLowerCase()
      if (sanitizedUsername.length < 3 || sanitizedUsername.includes(' ')) {
        setAuthError('Username must be at least 3 characters and contain no spaces.')
        setAuthLoading(false)
        return
      }

      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', sanitizedUsername)
        .maybeSingle()

      if (existingUser) {
        setAuthError('This username is already taken.')
        setAuthLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({ 
        email: authEmail.trim(), 
        password: authPassword, 
        options: { data: { username: sanitizedUsername } } 
      })

      if (error) {
        setAuthError(error.message)
      } else if (data?.user && !data.session) {
        setIsEmailSent(true)
        setAuthLoading(false)
        return
      } else if (data?.session) {
        authSuccess = true
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: authEmail.trim(), 
        password: authPassword 
      })
      
      if (error) setAuthError(error.message)
      else if (data?.session) authSuccess = true
    }

    if (authSuccess) {
      setIsGuest(false) 
      setShowAuthModal(false)
      setIsEmailSent(false)
      window.location.reload()
    }
    
    setAuthLoading(false)
  }

  const renderWitnessPill = () => {
    if (totalWitnesses === 0) return null

    if (isUserWitness && userWitnessEntry?.vote === 'pending') {
      return (
        <div className="flex items-center gap-4 bg-slate-900 text-white px-5 py-2 rounded-full shadow-lg ring-2 ring-emerald-500 animate-pulse w-max">
          <span className="uppercase tracking-widest text-[10px] text-emerald-300 font-bold ml-1">Verify</span>
          <button onClick={(e) => handleWitnessVoteAction(e, 'approved')} className="text-xl hover:scale-125 transition-transform origin-center" title="Confirm True">👍</button>
          <span onClick={(e) => { e.stopPropagation(); setShowWitnessModal(true); }} className="text-3xl drop-shadow-md leading-none mx-0.5 -mt-1 cursor-pointer hover:scale-110 transition-transform" title="View Witnesses">🕵️</span>
          <button onClick={(e) => handleWitnessVoteAction(e, 'denied')} className="text-xl hover:scale-125 transition-transform origin-center" title="Deny False">👎</button>
        </div>
      )
    }

    return (
      <div 
        onClick={(e) => { e.stopPropagation(); setShowWitnessModal(true); }} 
        className="flex items-center gap-2 bg-slate-200 border border-slate-400 px-5 py-2 rounded-full shadow-sm transition-transform hover:scale-105 w-max cursor-pointer"
        title="View Witnesses"
      >
        <span className="flex items-center text-emerald-600 text-base">
          <span className="text-[16px] mr-1">{approvedCount}</span> 👍
        </span>
        <span className="flex items-center text-slate-800 text-xl font-black px-2">
          <span className="text-[32px] drop-shadow-sm leading-none -mt-1">🕵️</span>
        </span>
        <span className="flex items-center text-rose-600 text-base">
          👎 <span className="text-[16px] ml-1">{deniedCount}</span>
        </span>
      </div>
    )
  }

  return (
    <div className={`w-full flex flex-col bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative ${isExpanded ? 'p-0 pb-6 rounded-t-[40px]' : 'p-5 rounded-[40px]'}`}>
      
      {/* Publisher Header */}
      <div className={`flex items-center justify-between mb-4 px-2 ${isExpanded ? 'pt-6 px-6' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href={`/${publisherName}`} onClick={(e) => e.stopPropagation()} className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 shrink-0 relative z-10">
            {quote.publisher?.avatar_url ? (
              <img src={quote.publisher.avatar_url} alt={publisherName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-slate-400" />
            )}
          </Link>
          <p className="text-slate-500 font-medium text-sm relative z-10">
            Published by <Link href={`/${publisherName}`} onClick={(e) => e.stopPropagation()} className="font-bold text-slate-800 hover:text-black hover:underline">{publisherName}</Link>
          </p>
        </div>
      </div>

      {/* Cinematic Graphic */}
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

      {/* Unified Reactions & Witness Pill Row */}
      {((quote.groupedReactions && quote.groupedReactions.length > 0) || totalWitnesses > 0) && (
        <div className={`flex flex-col sm:flex-row sm:items-center gap-3 w-full mt-4 relative z-10 ${isExpanded ? 'px-6' : 'px-2'}`}>
          
          {/* Witness Pill */}
          {totalWitnesses > 0 && (
            <div className="w-full sm:w-auto flex justify-center shrink-0 order-1 sm:order-2 pointer-events-auto">
              {renderWitnessPill()}
            </div>
          )}

          {/* Emoji Reactions */}
          <div className="w-full sm:flex-1 flex justify-start order-2 sm:order-1">
            {quote.groupedReactions && quote.groupedReactions.length > 0 && (
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 pointer-events-auto snap-x w-full max-w-[240px] sm:max-w-sm pb-1">
                {quote.groupedReactions.map((reaction, idx) => (
                  <button
                    key={`${reaction.emoji}-${idx}`}
                    onClick={(e) => handleExistingReactionClick(e, reaction.emoji)}
                    className={`shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      reaction.hasReacted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm">{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:block sm:flex-1 order-3 pointer-events-none"></div>
        </div>
      )}

      {/* Action Bar */}
      {!isExpanded && (
        <div className="relative flex items-center justify-between pt-4 mt-3 border-t border-slate-100 px-2 h-12">
          
          <div className="flex items-center gap-4 relative z-20">
            <div className="relative" ref={pickerRef}>
              <button onClick={handleReactClick} className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-500 transition-colors group">
                <SmilePlus className="w-6 h-6 group-active:scale-95 transition-transform" />
              </button>
              {showEmojiPicker && !isGuest && (
                <div onClick={(e) => e.stopPropagation()} className="absolute z-50 bottom-full left-0 mb-2 shadow-xl rounded-2xl overflow-hidden border border-slate-100 bg-white">
                  <CustomEmojiPicker onEmojiClick={handleReactionSelection} />
                </div>
              )}
            </div>

            <button onClick={handleCommentClick} className="flex items-center gap-1.5 text-slate-500 hover:text-blue-500 transition-colors group">
              <MessageCircle className="w-6 h-6 group-active:scale-95 transition-transform" />
              {quote.commentCount > 0 && <span className="text-sm font-bold mt-0.5">{quote.commentCount}</span>}
            </button>

            <button onClick={handleFavoriteClick} className={`flex items-center gap-1.5 transition-colors group ${isFav ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}>
              <Bookmark className={`w-6 h-6 group-active:scale-95 transition-transform ${isFav ? 'fill-amber-500' : ''}`} />
              {favCount > 0 && <span className={`text-sm font-bold mt-0.5 ${isFav ? 'text-amber-500' : ''}`}>{favCount}</span>}
            </button>
          </div>

          <div className="flex items-center relative z-20">
            <button onClick={handleShare} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors group">
              <Share2 className="w-6 h-6 group-active:scale-95 transition-transform" />
            </button>
          </div>
          
        </div>
      )}

      {/* 💥 NEW: WITNESS LIST MODAL WITH DYNAMIC PROFILES */}
      {showWitnessModal && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setShowWitnessModal(false);
          }} 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 cursor-default"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="text-3xl drop-shadow-sm">🕵️</div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-tight">Witnesses</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{totalWitnesses} Tagged</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWitnessModal(false)} 
                className="p-2.5 bg-white hover:bg-slate-100 rounded-full transition-colors text-slate-500 border border-slate-200 shadow-sm active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Witness List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {witnesses.map((w, idx) => {
                // 💥 Combine parent-provided profile data with dynamically fetched profile data
                const activeProfile = w.profile || (w.witness_user_id ? witnessProfiles[w.witness_user_id] : null);
                
                let witnessName = 'Pending Invite';
                if (activeProfile?.username) {
                  witnessName = activeProfile.username;
                } else if (w.witness_email) {
                  witnessName = w.witness_email;
                }

                const avatarUrl = activeProfile?.avatar_url;

                return (
                  <div key={w.id || idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 rounded-2xl transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={witnessName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-slate-800 text-sm truncate">{witnessName}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${w.vote === 'approved' ? 'text-emerald-500' : w.vote === 'denied' ? 'text-rose-500' : 'text-slate-400'}`}>
                          {w.vote}
                        </span>
                      </div>
                    </div>
                    
                    {/* Vote Icon */}
                    <div className="text-xl shrink-0 bg-white shadow-sm w-10 h-10 flex items-center justify-center rounded-full border border-slate-100">
                      {w.vote === 'approved' ? '👍' : w.vote === 'denied' ? '👎' : '⏳'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setShowAuthModal(false);
            if (isEmailSent) setIsEmailSent(false);
          }} 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 cursor-default"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
          >
            <button 
              onClick={() => {
                setShowAuthModal(false);
                if (isEmailSent) setIsEmailSent(false);
              }} 
              className="absolute top-4 right-4 w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
            
            {isEmailSent ? (
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Check your email!</h2>
                <p className="text-slate-500 text-sm mb-8 px-2">
                  We sent a secure verification link to <strong className="text-slate-800">{authEmail}</strong>. Click it to activate your account and join the conversation.
                </p>
                <button 
                  onClick={() => {
                    setShowAuthModal(false);
                    setIsEmailSent(false);
                  }} 
                  className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 active:scale-95 transition"
                >
                  Got it
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black text-slate-800 mb-2">
                  {isLogin ? 'Welcome back' : 'Claim your space'}
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  {isLogin ? 'Log in to continue.' : 'Create a free account to unlock all features.'}
                </p>

                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Log In
                  </button>
                </div>
                
                {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{authError}</div>}

                <form onSubmit={handleInContextAuth} className="space-y-3">
                  {!isLogin && (
                    <div className="relative">
                      <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 font-bold">@</span>
                      <input 
                        type="text" 
                        placeholder="username" 
                        value={authUsername}
                        onChange={e => setAuthUsername(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-medium"
                        required={!isLogin} 
                        maxLength={20}
                      />
                    </div>
                  )}

                  <input 
                    type="email" 
                    placeholder="Email address" 
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-medium"
                    required 
                  />
                  
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-medium"
                    required 
                  />
                  
                  <button 
                    type="submit" 
                    disabled={authLoading}
                    className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Log In' : 'Create Account')}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}