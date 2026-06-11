'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// This function guarantees the text shrinks to fit the card without EVER scrolling.
const getQuoteFontSize = (text: string) => {
  const len = text.length
  if (len < 40) return 'text-4xl md:text-5xl'
  if (len < 80) return 'text-3xl md:text-4xl'
  if (len < 140) return 'text-2xl md:text-3xl'
  if (len < 200) return 'text-xl md:text-2xl'
  return 'text-lg md:text-xl'
}

function PreviewQuoteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const targetId = searchParams.get('targetId')
  const targetUsername = searchParams.get('targetUsername')
  const inviteEmail = searchParams.get('inviteEmail')
  const quoteText = searchParams.get('quote') || ''
  const bgType = searchParams.get('bgType') || 'template'
  const templateId = searchParams.get('templateId')
  const templateGradient = searchParams.get('templateGradient') || 'from-slate-200 to-slate-300'

  const displayTarget = targetUsername || inviteEmail || 'Unknown'
  // Auto-generate a fake @handle for the signature
  const displayHandle = `@${displayTarget.toLowerCase().replace(/[^a-z0-9]/g, '')}`
  
  const [isPublishing, setIsPublishing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [currentUsername, setCurrentUsername] = useState('You')
  
  // State to hold the target user's avatar URL
  const [targetAvatarUrl, setTargetAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      // Fetch current publisher's username
      const { data: { user } } = await supabase.auth.getUser()
      if (user && isMounted) {
        const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
        if (data?.username) setCurrentUsername(data.username)
      }

      // Fetch the target user's avatar from the DB if we have a targetId
      if (targetId && isMounted) {
        const { data: targetData } = await supabase.from('profiles').select('avatar_url').eq('id', targetId).single()
        if (targetData?.avatar_url) {
          setTargetAvatarUrl(targetData.avatar_url)
        }
      }
    }
    
    void fetchData()

    return () => { isMounted = false }
  }, [supabase, targetId])

  const bgStyle = bgType === 'template' 
    ? templateGradient 
    : 'from-slate-400 to-slate-700' // Base fallback gradient so the image blend mode pops

    const handlePublish = async () => {
      setIsPublishing(true)
      setErrorMsg('')
  
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setErrorMsg("You must be logged in to post a quote.")
        setIsPublishing(false)
        return
      }
  
      // Save the quote metadata to Supabase instance
      const { error: dbError } = await supabase
        .from('quotes')
        .insert({
          publisher_id: user.id,
          quoted_user_id: targetId || null,
          quoted_email: inviteEmail || null,
          content: quoteText,
          template_id: bgType === 'template' ? (templateId || null) : null,
          live_photo_url: null 
        })
  
      if (dbError) {
        console.error(dbError)
        setErrorMsg(dbError.message)
        setIsPublishing(false)
        return
      }
  
      // If an off-platform email was tagged, fire the Invite API
      if (inviteEmail) {
        try {
          const inviteResponse = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: inviteEmail,
              publisherName: currentUsername,
              quoteContent: quoteText
            })
          })
  
          if (!inviteResponse.ok) {
            console.warn('Quote saved successfully, but invitation email dropped delivery steps.')
          }
        } catch (err) {
          console.error('Failed to communicate with proxy background workers:', err)
        }
      }

      // If an existing user was tagged, fire the Notify API in the background
      if (targetUsername) {
        fetch('/api/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quoterUsername: currentUsername, 
            quotedUsername: targetUsername, 
            quoteContent: quoteText
          }),
        }).catch(err => console.error('Failed to dispatch background notification:', err))
      }
  
      // Redirect to the main feed
      router.push('/feed')
    }

  return (
    <div className="flex flex-col pt-10 px-6 w-full max-w-2xl mx-auto min-h-[calc(100vh-120px)] pb-10">
      
      <div className="relative text-center mb-8 shrink-0">
        <button 
          onClick={() => router.back()}
          title="Go Back"
          className="absolute left-0 top-0 p-4 hover:bg-slate-100 rounded-full transition"
        >
          <ArrowLeft className="w-12 h-12 text-black" />
        </button>
        <h1 className="text-5xl font-black text-black">PinQuo</h1>
        <p className="text-slate-500 font-bold text-2xl mt-3 underline decoration-slate-300 underline-offset-4 decoration-2">Quote Preview</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        
        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 mb-6 text-2xl font-bold text-slate-500 text-center">
          <span className="text-slate-800 underline decoration-slate-300 underline-offset-4 decoration-2">{displayTarget}</span>
          <span className="font-medium">has been quoted by</span>
          <span className="text-slate-800 underline decoration-slate-300 underline-offset-4 decoration-2">{currentUsername}</span>
        </div>

        {/* Quotecard */}
        <div className="w-full max-w-[460px] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-100 mb-10">
          
          <div className="relative w-full h-64 shrink-0 pointer-events-none">
            {/* Base Gradient */}
            <div className={`absolute inset-0 bg-linear-to-br ${bgStyle}`}></div>
            
            {/* avatar blend */}
            {bgType === 'avatar' && (
              targetAvatarUrl ? (
                <img 
                  src={targetAvatarUrl} 
                  alt={`${displayTarget}'s Avatar`}
                  className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-80"
                />
              ) : (
                // Fallback for if no avatar url is present
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 mix-blend-overlay"></div>
              )
            )}
            
            {/* smooth fade to white*/}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-linear-to-t from-white via-white/60 to-transparent"></div>
          </div>

          {/* Bottom Text Area */}
          <div className="relative bg-white px-8 pb-10 pt-2 flex flex-col items-center text-center -mt-12 z-10 pointer-events-none">
            
            {/* Quotation Marks */}
            <div className="text-[80px] font-serif font-black text-black leading-none tracking-tighter mb-2 select-none">
              “ ”
            </div>
            
            {/* Dynamic Sized Text */}
            <p className={`font-medium text-black leading-snug wrap-break-words whitespace-pre-wrap px-2 ${getQuoteFontSize(quoteText)}`}>
              {quoteText}
            </p>

            {/* Signature Area */}
            <div className="w-full mt-10 flex flex-col items-center relative">
              <div className="w-16 h-[2px] bg-black mb-3"></div>
              <p className="text-2xl font-medium text-black tracking-wide">
                -{displayTarget}
              </p>
              <p className="text-slate-400 font-medium text-lg mt-0.5">
                {displayHandle}
              </p>
              
              {/* Subtle watermark */}
              <span className="absolute bottom-0 right-0 text-slate-400 font-medium text-sm translate-y-8">
                PinQuo
              </span>
            </div>
            
          </div>
        </div>

        {errorMsg && (
          <p className="text-red-500 font-bold text-center text-xl mb-6">{errorMsg}</p>
        )}

        <div className="w-full mt-auto">
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full max-w-[460px] mx-auto bg-[#bbf7d0] text-emerald-950 hover:bg-[#86efac] active:scale-95 disabled:opacity-70 disabled:hover:bg-[#bbf7d0] disabled:active:scale-100 font-black py-8 px-12 rounded-[40px] transition-all shadow-xl text-3xl flex items-center justify-center gap-4 border-4 border-emerald-200"
          >
            {isPublishing ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              <>
                Publish <CheckCircle2 className="w-10 h-10 stroke-3" />
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
    <Suspense fallback={<div className="p-16 text-center text-slate-500 text-2xl font-bold">Generating preview...</div>}>
      <PreviewQuoteForm />
    </Suspense>
  )
}