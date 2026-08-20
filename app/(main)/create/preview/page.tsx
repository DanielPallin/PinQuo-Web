'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

  const targetId = searchParams.get('targetId')
  const targetUsername = searchParams.get('targetUsername')
  const inviteEmail = searchParams.get('inviteEmail')
  const customName = searchParams.get('customName')
  const quoteText = searchParams.get('quote') || ''
  const bgType = searchParams.get('bgType') || 'template'
  const templateId = searchParams.get('templateId')
  const templateGradient = searchParams.get('templateGradient') || 'from-slate-200 to-slate-300'
  const templateImageUrl = searchParams.get('templateImageUrl') // Fetches the new bucket URL!

  const [isPublishing, setIsPublishing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [currentUsername, setCurrentUsername] = useState('You')
  const [targetAvatarUrl, setTargetAvatarUrl] = useState<string | null>(null)

  const displayTarget = targetUsername || customName || inviteEmail || 'Unknown'
  const displayHandle = targetUsername || inviteEmail ? `@${displayTarget.toLowerCase().replace(/[^a-z0-9]/g, '')}` : null

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && isMounted) {
        const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
        if (data?.username) setCurrentUsername(data.username)
      }

      if (targetId && isMounted && targetId !== 'undefined' && targetId !== 'null') {
        const { data: targetData } = await supabase.from('profiles').select('avatar_url').eq('id', targetId).single()
        if (targetData?.avatar_url) setTargetAvatarUrl(targetData.avatar_url)
      }
    }

    void fetchData()
    return () => { isMounted = false }
  }, [supabase, targetId])

  const handlePublish = async () => {
    setIsPublishing(true)
    setErrorMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErrorMsg("You must be logged in to post a quote.")
      setIsPublishing(false)
      return
    }

    const isValidTargetId = targetId && targetId !== 'undefined' && targetId !== 'null' && targetId.trim() !== '';
    const targetUid = isValidTargetId ? targetId : null;
    const targetEmail = (inviteEmail && inviteEmail.trim() !== "") ? inviteEmail : null;
    const authorName = (customName && customName.trim() !== "") ? customName : null;

    const quoteData = {
      publisher_id: user.id,
      content: quoteText,
      template_id: bgType === 'template' ? (templateId || null) : null,
      live_photo_url: null,
      quoted_user_id: targetUid,
      quoted_email: targetEmail,
      custom_author_name: authorName
    }

    const { error: dbError, data: newQuoteData } = await supabase
      .from('quotes')
      .insert([quoteData])
      .select('id')
      .single()

    if (dbError) {
      console.error("Supabase Insert Error:", dbError)
      setErrorMsg(dbError.message || "Failed to publish quote.")
      setIsPublishing(false)
      return
    }

    if (targetUid && targetUid !== user.id && newQuoteData?.id) {
      await supabase.from('notifications').insert({
        receiver_id: targetUid,
        actor_id: user.id,
        type: 'quote',
        quote_id: newQuoteData.id
      });
    }

    // Fire-and-forget side effects
    try {
      let publisherName = currentUsername;
      if (publisherName === "You") {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
        if (profile?.username) publisherName = profile.username;
      }

      const sideEffects: Promise<unknown>[] = [];

      if (targetEmail) {
        sideEffects.push(
          fetch("/api/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetEmail, publisherName, quoteContent: quoteText }),
            keepalive: true
          }).catch(err => console.error("Invite error:", err))
        )
      }

      if (targetUsername) {
        sideEffects.push(
          fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quoterUsername: publisherName, quotedUsername: targetUsername, quoteContent: quoteText }),
            keepalive: true
          }).catch(err => console.error("Notify error:", err))
        )
      }

      if (sideEffects.length > 0) {
        Promise.all(sideEffects).catch(err => console.error("Background task error:", err))
      }
    } catch (err) {
      console.error("Background task setup error:", err);
    }

    router.push('/feed')
  }

  return (
    <div className="flex flex-col pt-6 px-4 w-full max-w-lg mx-auto min-h-[100dvh] pb-6 bg-slate-50/50">
      
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
        
        {/* Info Pill (Replaces the massive text lines) */}
        <div className="flex items-center gap-1.5 mb-6 text-xs font-bold text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <span className="text-slate-800">{displayTarget}</span>
          <span className="text-slate-400 font-medium">quoted by</span>
          <span className="text-slate-800">{currentUsername}</span>
        </div>

        {/* The Quote Card - 1:1 Match with the Feed Component */}
        <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-xl overflow-hidden flex flex-col border border-slate-100 mb-8 relative">
          
          <div className="relative w-full h-48 shrink-0 pointer-events-none">
            {/* 1. Bucket Image */}
            {bgType === 'template' && templateImageUrl && (
              <img src={templateImageUrl} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
            )}

            {/* 2. Dynamic Cinematic Filters */}
            {bgType === 'template' && templateImageUrl && (
               <>
                 <div className="absolute inset-0 bg-slate-900/30 mix-blend-multiply"></div>
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/10 to-black/60"></div>
               </>
            )}

            {/* 3. Fallback CSS Gradient */}
            {bgType === 'template' && !templateImageUrl && (
              <div className={`absolute inset-0 bg-linear-to-br ${templateGradient}`}></div>
            )}

            {/* 4. Avatar Mode */}
            {bgType === 'avatar' && (
              <div className={`absolute inset-0 ${targetAvatarUrl ? '' : 'bg-black/20'} mix-blend-overlay`}>
                {targetAvatarUrl && <img src={targetAvatarUrl} alt="" className="w-full h-full object-cover opacity-80" />}
              </div>
            )}
            
            {/* Soft Text Blend */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white via-white/95 to-transparent"></div>
          </div>

          <div className="relative bg-white px-6 pb-8 pt-2 flex flex-col items-center text-center -mt-10 z-10 pointer-events-none">
            <div className="text-[50px] font-serif font-black text-slate-800 leading-none mb-2 select-none">“ ”</div>
            
            <p className={`font-medium text-slate-900 leading-snug wrap-break-words whitespace-pre-wrap px-2 ${getQuoteFontSize(quoteText)}`}>
              {quoteText}
            </p>
            
            <div className="w-full mt-6 flex flex-col items-center relative">
              <div className="w-10 h-[3px] bg-slate-800 mb-3 rounded-full"></div>
              
              <p className={`text-lg font-bold tracking-wide ${customName ? 'text-slate-400 italic font-medium' : 'text-slate-900'}`}>
                {displayTarget}
              </p>
              
              {displayHandle && !customName && (
                <p className="text-slate-400 font-medium text-xs mt-0.5">
                  {displayHandle}
                </p>
              )}
            </div>
          </div>
        </div>

        {errorMsg && <p className="text-red-500 font-bold text-center text-sm mb-4 px-4">{errorMsg}</p>}

        {/* Sleek, Modern Publish Button */}
        <div className="w-full max-w-[420px] mt-auto">
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full bg-[#bbf7d0] text-emerald-950 hover:bg-[#86efac] font-black py-4 px-6 rounded-full transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 border-[3px] border-emerald-200 disabled:opacity-70 disabled:active:scale-100 text-xl"
          >
            {isPublishing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Publish to Feed <CheckCircle2 className="w-6 h-6 stroke-[2.5px]" />
              </>
            )}
          </button>
        </div>
      </div>
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