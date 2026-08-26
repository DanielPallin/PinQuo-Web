'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, Sparkles, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Types & Helpers
type ParsedWitness = { type: 'user' | 'email'; value: string }

const getQuoteFontSize = (text: string) => {
  const len = text.length
  if (len < 40) return 'text-3xl md:text-4xl'
  if (len < 80) return 'text-2xl md:text-3xl'
  if (len < 140) return 'text-xl md:text-2xl'
  if (len < 200) return 'text-lg md:text-xl'
  return 'text-base md:text-lg'
}

function PreviewQuoteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // URL Params
  const targetId = searchParams.get('targetId')
  const targetUsername = searchParams.get('targetUsername')
  const inviteEmail = searchParams.get('inviteEmail')
  const customName = searchParams.get('customName')
  const quoteText = searchParams.get('quote') || ''
  const bgType = searchParams.get('bgType') || 'template'
  const snapImageUrl = searchParams.get('snapImageUrl')
  const templateId = searchParams.get('templateId')
  const templateGradient = searchParams.get('templateGradient') || 'from-slate-200 to-slate-300'
  const templateImageUrl = searchParams.get('templateImageUrl')
  
  // Safely parse witnesses with tight typings
  const witnesses: ParsedWitness[] = (() => {
    const value = searchParams.get('witnesses')
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((w): w is ParsedWitness => 
        typeof w === 'object' && w !== null && 
        'type' in w && ['user', 'email'].includes(w.type) && 
        'value' in w && typeof w.value === 'string'
      )
    } catch {
      return []
    }
  })()

  // State
  const [isPublishing, setIsPublishing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [currentUsername, setCurrentUsername] = useState('You')
  const [targetAvatarUrl, setTargetAvatarUrl] = useState<string | null>(null)

  // PLG Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLogin, setIsLogin] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Derived Variables
  const displayTarget = targetUsername || customName || inviteEmail || 'Unknown'
  const isRegisteredUser = !!targetUsername
  const isValidTargetId = typeof targetId === 'string' && targetId.trim() !== '' && targetId !== 'undefined' && targetId !== 'null'

  const cleanQuoteContent = quoteText
    .replace(/^["'“”«»]+|["'“”«»]+$/g, '')
    .trim()

  // Data Fetching
  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && isMounted) {
        const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
        if (data?.username) setCurrentUsername(data.username)
      }

      if (isValidTargetId && isMounted) {
        const { data: targetData } = await supabase.from('profiles').select('avatar_url').eq('id', targetId).single()
        if (targetData?.avatar_url) setTargetAvatarUrl(targetData.avatar_url)
      }
    }

    void fetchData()
    return () => { isMounted = false }
  }, [supabase, targetId, isValidTargetId])

  // Publishing Structure
  const executePublish = async (user: any) => {
    setIsPublishing(true)
    setErrorMsg('')

    try {
      // 1. Handle Live Snap Uploads (If applicable)
      let finalLivePhotoUrl = null
      if (bgType === 'snap' && snapImageUrl) {
        try {
          const res = await fetch(snapImageUrl)
          const blob = await res.blob()
          const uniqueId = typeof crypto !== 'undefined' ? crypto.randomUUID() : new Date().getTime()
          const fileName = `${user.id}/web_snap_${uniqueId}.jpg`
          
          // Supabase bucket: quotes_media
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('quotes_media') 
            .upload(fileName, blob, { contentType: 'image/jpeg' })
            
          if (uploadData && !uploadErr) {
            const { data: { publicUrl } } = supabase.storage.from('quotes_media').getPublicUrl(fileName)
            finalLivePhotoUrl = publicUrl
          } else {
            console.error("Storage upload error:", uploadErr)
          }
        } catch (err) {
          console.error("Failed to process Live Snap image:", err)
        }
      }

      // Insert the Quote
      const quoteData = {
        publisher_id: user.id,
        content: quoteText,
        template_id: bgType === 'template' ? (templateId || null) : null,
        live_photo_url: finalLivePhotoUrl,
        quoted_user_id: isValidTargetId ? targetId : null,
        quoted_email: (inviteEmail && inviteEmail.trim() !== "") ? inviteEmail.trim() : null,
        custom_author_name: (customName && customName.trim() !== "") ? customName.trim() : null
      }

      const { error: dbError, data: newQuoteData } = await supabase
        .from('quotes')
        .insert([quoteData])
        .select('id')
        .single()

      if (dbError || !newQuoteData) throw new Error(dbError?.message || "Failed to publish quote.")

      // Batch Insert Witnesses
      if (witnesses.length > 0) {
        const witnessPayload = witnesses.map(w => ({
          quote_id: newQuoteData.id,
          witness_user_id: w.type === 'user' ? w.value : null,
          witness_email: w.type === 'email' ? w.value : null
        }))
        const { error: witnessErr } = await supabase.from('quote_witnesses').insert(witnessPayload)
        if (witnessErr) console.error("Witness Insert Error:", witnessErr)
      }

      // In-App Notification for Registered Targets
      if (isValidTargetId && targetId !== user.id) {
        await supabase.from('notifications').insert({
          receiver_id: targetId,
          actor_id: user.id,
          type: 'quote',
          quote_id: newQuoteData.id
        })
      }

      // Fire-and-Forget External Notifications (Emails)
      const sideEffects: Promise<unknown>[] = []
      let publisherName = currentUsername
      
      // Safety fetch if username is still default
      if (publisherName === "You") {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single()
        if (profile?.username) publisherName = profile.username
      }

      if (quoteData.quoted_email) {
        sideEffects.push(
          fetch("/api/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: quoteData.quoted_email, publisherName, quoteContent: quoteText }),
            keepalive: true
          })
        )
      }

      if (targetUsername) {
        sideEffects.push(
          fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quoterUsername: publisherName, quotedUsername: targetUsername, quoteContent: quoteText }),
            keepalive: true
          })
        )
      }

      if (witnesses.length > 0) {
        sideEffects.push(
          fetch("/api/witness-invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ witnesses, publisherName, quoteContent: quoteText }),
            keepalive: true
          })
        )
      }

      // Use allSettled so one failing email doesn't block the rest
      if (sideEffects.length > 0) {
        Promise.allSettled(sideEffects).catch(err => console.error("Background task error:", err))
      }

      router.push('/feed')

    } catch (err: any) {
      console.error("Publishing error:", err)
      setErrorMsg(err.message || "Something went wrong.")
      setIsPublishing(false)
    }
  }

  // Gatekeeper
  const attemptPublish = async () => {
    setIsPublishing(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setIsPublishing(false)
      setShowAuthModal(true)
      return
    }
    
    await executePublish(user)
  }

  // In-Context PLG Auth
  const handleInContextAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    
    const { data, error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { username: authEmail.split('@')[0] } } })

    if (!error && data?.user) {
      setShowAuthModal(false)
      await executePublish(data.user)
    } else {
      setAuthError(error?.message || 'Authentication failed')
    }
    setAuthLoading(false)
  }

  return (
    <div className="flex flex-col pt-6 px-4 w-full max-w-lg mx-auto min-h-[100dvh] pb-6 bg-slate-50/50 relative">
      
      {/* Sleek Modern Header */}
      <div className="relative text-center mb-6 shrink-0 flex items-center justify-center">
        <button onClick={() => router.back()} className="absolute left-0 p-2 hover:bg-slate-200 rounded-full transition text-slate-700">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            Preview <Sparkles className="w-5 h-5 text-emerald-500" />
          </h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start w-full">
        
        {/* Info Pill */}
        <div className="flex items-center gap-1.5 mb-6 text-xs font-bold text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <span className="text-slate-800">{displayTarget}</span>
          <span className="text-slate-400 font-medium">quoted by</span>
          <span className="text-slate-800">{currentUsername}</span>
        </div>

        {/* Preview Card */}
        <div className="w-full max-w-[420px] bg-slate-900 rounded-[32px] overflow-hidden flex flex-col relative aspect-square shadow-2xl mb-8 border border-slate-200/50">
          
          <img 
            src="/PinQuote-Logo.png" 
            alt="PinQuo" 
            className="absolute top-5 left-5 h-5 sm:h-6 w-auto opacity-60 drop-shadow-md z-20 pointer-events-none select-none"
          />

          {/* Background Layers */}
          {bgType === 'template' ? (
            templateImageUrl ? (
              <img 
                src={templateImageUrl} 
                alt="Quote Background" 
                crossOrigin="anonymous" 
                className="absolute inset-0 w-full h-full object-cover" 
                style={{ filter: 'contrast(1.20) saturate(1.2) sepia(0.10) brightness(0.90)' }}
              />
            ) : (
              <div className={`absolute inset-0 bg-linear-to-br ${templateGradient}`}></div>
            )
          ) : bgType === 'snap' && snapImageUrl ? (
            <img src={snapImageUrl} alt="Live Snap" className="absolute inset-0 w-full h-full object-cover" />
          ) : bgType === 'avatar' ? (
            <div className="absolute inset-0 mix-blend-overlay opacity-80">
              {targetAvatarUrl ? (
                <img src={targetAvatarUrl} alt="Bg" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-slate-800"></div>
              )}
            </div>
          ) : null}

          {/* Cinematic Vignettes */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 mix-blend-multiply pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>

          {/* Content Overlay */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 sm:p-10 text-center pointer-events-none select-none">
            
            <div className="relative inline-block max-w-[75%] mx-auto mt-4">
              <span className="absolute top-0 left-0 -translate-x-[110%] -translate-y-[40%] text-5xl sm:text-7xl font-serif font-black text-white/50 drop-shadow-lg leading-none pointer-events-none select-none">
                &ldquo;
              </span>
              
              <p 
                className={`font-black text-white leading-snug whitespace-pre-wrap relative z-10 ${getQuoteFontSize(cleanQuoteContent)}`}
                style={{ textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,1)' }}
              >
                {cleanQuoteContent}
              </p>

              <span className="absolute bottom-0 right-0 translate-x-[110%] translate-y-[30%] text-5xl sm:text-7xl font-serif font-black text-white/50 drop-shadow-lg leading-none pointer-events-none select-none">
                &rdquo;
              </span>
            </div>
            
            <div className="mt-8 sm:mt-10 flex flex-col items-center relative z-10">
              <p 
                className={`font-bold tracking-wide text-lg text-white/90 ${(!isRegisteredUser && !customName) ? 'italic font-medium' : ''}`}
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)' }}
              >
                &mdash; {displayTarget}
              </p>
            </div>
          </div>
        </div>

        {errorMsg && <p className="text-red-500 font-bold text-center text-sm mb-4 px-4">{errorMsg}</p>}

        {/* Publish Button */}
        <div className="mt-8 w-full">
          <button
            onClick={attemptPublish}
            disabled={isPublishing}
            className="w-full bg-[#bbf7d0] text-emerald-950 hover:bg-[#86efac] font-black py-4 px-6 rounded-full transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 border-[3px] border-emerald-200 disabled:opacity-70 disabled:active:scale-100 text-xl"
          >
            {isPublishing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Publish <CheckCircle2 className="w-6 h-6 stroke-[2.5px]" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition">
              <X className="w-4 h-4" />
            </button>
            
            <h2 className="text-2xl font-black text-slate-800 mb-2">Publish your quote</h2>
            <p className="text-slate-500 text-sm mb-6">Create a free account to publish quotes.</p>
            
            {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{authError}</div>}

            <form onSubmit={handleInContextAuth} className="space-y-4">
              <input 
                type="email" 
                placeholder="Email address" 
                onChange={e => setAuthEmail(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-medium"
                required 
              />
              <input 
                type="password" 
                placeholder="Password" 
                onChange={e => setAuthPassword(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-medium"
                required 
              />
              <button 
                type="submit" 
                disabled={authLoading}
                className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Log In & Publish' : 'Sign Up & Publish')}
              </button>
            </form>
            
            <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center mt-5 text-sm font-bold text-slate-400 hover:text-black transition-colors">
              {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>}>
      <PreviewQuoteForm />
    </Suspense>
  )
}