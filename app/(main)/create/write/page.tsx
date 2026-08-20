'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Safe list for your fallback gradients
const TAILWIND_SAFELIST = "bg-orange-200 bg-yellow-200 bg-slate-300 bg-slate-200 from-orange-200 to-red-200 from-yellow-200 to-amber-200 from-slate-300 to-slate-400"

type Template = {
  id: string
  name: string
  style_config: {
    baseColor?: string
    gradient: string
  }
  access_tier: 'free' | 'pro' | 'premium'
  image_url?: string 
}

function WriteQuoteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const targetId = searchParams.get('targetId')
  const targetUsername = searchParams.get('targetUsername')
  const inviteEmail = searchParams.get('inviteEmail')
  const customName = searchParams.get('customName') 

  const isExistingUser = !!targetId
  const displayTarget = targetUsername || customName || inviteEmail || 'Unknown'

  const [quoteText, setQuoteText] = useState('')
  const [bgType, setBgType] = useState<'avatar' | 'template' | 'snap'>(
    isExistingUser ? 'avatar' : 'template'
  )

  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

  // Smart Fetch: Grabs 10 free + User's unlocked PRO templates
  useEffect(() => {
    let isMounted = true

    const fetchTemplates = async () => {
      setIsLoadingTemplates(true)
      const { data: { user } } = await supabase.auth.getUser()

      try {
        // Fetch up to 10 Free Templates (using access_tier now)
        const { data: freeTemplates, error: freeError } = await supabase
          .from('templates')
          .select('id, name, style_config, access_tier, image_url')
          .eq('access_tier', 'free')
          .order('created_at', { ascending: true })
          .limit(10)

        let ownedTemplates: Template[] = []

        // Fetch templates the user owns
        if (user) {
          const { data: unlocked, error: unlockError } = await supabase
            .from('user_unlocked_templates')
            .select('template_id')
            .eq('user_id', user.id)
            
          if (!unlockError && unlocked && unlocked.length > 0) {
            const unlockedIds = unlocked.map(u => u.template_id)
            
            const { data: premiumData } = await supabase
              .from('templates')
              .select('id, name, style_config, access_tier, image_url')
              .in('id', unlockedIds)
            
            if (premiumData) ownedTemplates = premiumData
          }
        }

        if (isMounted) {
          const combined = [...(freeTemplates || []), ...ownedTemplates]
          const uniqueTemplates = Array.from(new Map(combined.map(item => [item.id, item])).values())
          
          setTemplates(uniqueTemplates)
          if (uniqueTemplates.length > 0 && bgType === 'template') {
            setSelectedTemplate(uniqueTemplates[0])
          }
        }
      } catch (error) {
        console.error("Error fetching templates:", error)
      } finally {
        if (isMounted) setIsLoadingTemplates(false)
      }
    }

    fetchTemplates()
    return () => { isMounted = false }
  }, [supabase, bgType])

  const handlePreview = () => {
    if (!quoteText.trim()) return

    const params = new URLSearchParams({ quote: quoteText, bgType: bgType })

    if (targetId) params.append('targetId', targetId)
    if (targetUsername) params.append('targetUsername', targetUsername)
    if (inviteEmail) params.append('inviteEmail', inviteEmail)
    if (customName) params.append('customName', customName)
    
    if (bgType === 'template' && selectedTemplate) {
      params.append('templateId', selectedTemplate.id)
      params.append('templateGradient', selectedTemplate.style_config.gradient)
    if (selectedTemplate.style_config?.gradient) {
        params.append('templateGradient', selectedTemplate.style_config.gradient)
      }
      
      if (selectedTemplate.image_url) {
        params.append('templateImageUrl', selectedTemplate.image_url)
      }
    }

    router.push(`/create/preview?${params.toString()}`)
  }

  return (
    <div className="flex flex-col pt-6 px-4 w-full max-w-lg mx-auto min-h-[calc(100vh-120px)] pb-6">
      
      {/* Header */}
      <div className="relative text-center mb-6 shrink-0">
        <button 
          onClick={() => router.back()}
          title="Go Back"
          className="absolute left-0 top-0 p-2 hover:bg-slate-100 rounded-full transition"
        >
          <ArrowLeft className="w-8 h-8 text-black" />
        </button>
        <h1 className="text-3xl font-black text-black leading-tight">PinQuo</h1>
        <p className="text-slate-500 font-bold text-sm mt-1">Quoting {displayTarget}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start gap-4 w-full">
        
        {/* SNAP PRO */}
        <div className="flex flex-col items-center w-full opacity-50 shrink-0">
          <button 
            type="button" disabled
            className="w-full flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-400 font-black py-4 px-4 rounded-[28px] text-base border-2 border-dashed border-slate-200 cursor-not-allowed shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Camera className="w-6 h-6" strokeWidth={2.5} />
              <span>Snap Live-Photo (PRO)</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Coming in v2.0</span>
          </button>
        </div>

        <div className="text-slate-400 font-black text-xs uppercase tracking-widest shrink-0 mt-1">Or</div>

        {/* AVATAR OPTION */}
        {isExistingUser && (
          <div className="w-full flex flex-col items-center shrink-0">
            <button
              type="button"
              onClick={() => setBgType('avatar')}
              className={`w-full py-4 px-4 rounded-[28px] font-black text-base transition-all ${
                bgType === 'avatar' 
                  ? 'bg-[#bbf7d0] text-emerald-950 shadow-md ring-4 ring-emerald-200' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Use Quoted Users Avatar
            </button>
            <div className="text-slate-400 font-black text-xs uppercase tracking-widest shrink-0 mt-5">Or</div>
          </div>
        )}

        {/* NEW TEMPLATE CAROUSEL */}
        <div className="w-full flex flex-col items-center shrink-0 mt-2">
          <p className="text-xl font-black text-slate-800 mb-4">Choose template</p>
          
          {isLoadingTemplates ? (
            <Loader2 className="w-8 h-8 animate-spin text-slate-300 my-4" />
          ) : templates.length > 0 ? (
            <div className="w-full relative max-w-md mx-auto">
              
              {/* Horizontal Scrollable Carousel */}
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 px-2 items-center">
                {templates.map((template) => {
                  const isSelected = bgType === 'template' && selectedTemplate?.id === template.id
                  const gradient = template.style_config?.gradient || 'from-slate-200 to-slate-300'
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => { setBgType('template'); setSelectedTemplate(template) }}
                      className={`relative shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden snap-center transition-all duration-200 ${
                        isSelected 
                          ? 'ring-4 ring-emerald-400 scale-105 shadow-lg' 
                          : 'opacity-70 hover:opacity-100 scale-95 border-2 border-slate-100'
                      }`}
                    >
                      {/* Render Image from Bucket, fallback to style_config gradient */}
                      {template.image_url ? (
                        <img 
                          src={template.image_url} 
                          alt={template.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-linear-to-br ${gradient}`}></div>
                      )}

                      {/* Dynamic Badges for Owned Templates */}
                      {template.access_tier === 'pro' && (
                        <div className="absolute top-2 right-2 bg-yellow-500/90 backdrop-blur-md text-yellow-950 text-[9px] font-black px-2 py-1 rounded-full z-10 shadow-sm border border-yellow-300">
                          PRO
                        </div>
                      )}
                      {template.access_tier === 'premium' && (
                        <div className="absolute top-2 right-2 bg-purple-600/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-full z-10 shadow-sm border border-purple-400">
                          EXCLUSIVE
                        </div>
                      )}
                      
                      {/* Name Label */}
                      <div className={`absolute bottom-0 left-0 w-full p-2 text-center text-[10px] sm:text-xs font-black uppercase tracking-wide truncate backdrop-blur-md z-10 transition-colors ${
                        isSelected ? 'bg-emerald-400/90 text-emerald-950' : 'bg-white/80 text-slate-700'
                      }`}>
                        {template.name}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 font-bold text-sm">No templates found.</p>
          )}
        </div>

        {/* QUOTE INPUT SECTION */}
        <div className="w-full mt-4 shrink-0">
          <p className="text-xl font-black text-slate-800 mb-3 text-center">Quote:</p>
          <div className="relative w-full bg-slate-100 rounded-[36px] p-6 pb-24 shadow-inner">
            <span className="absolute top-5 left-6 text-5xl font-serif text-slate-300">&ldquo;</span>
            <textarea
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              placeholder="Type the quote here..."
              className="w-full h-20 bg-transparent text-slate-900 text-xl resize-none focus:outline-none placeholder:text-slate-400 pl-12 pr-8 pt-2 leading-relaxed font-semibold"
            />
            <span className="absolute bottom-[85px] right-6 text-5xl font-serif text-slate-300">&rdquo;</span>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
              <button
                onClick={handlePreview}
                disabled={quoteText.trim().length === 0 || (bgType === 'template' && !selectedTemplate)}
                className="bg-[#bbf7d0] text-emerald-950 font-black py-4 px-16 rounded-full disabled:opacity-50 transition hover:bg-[#a7f3d0] active:scale-95 shadow-sm text-lg"
              >
                Preview
              </button>
            </div>
          </div>
        </div>

      </div>
      
      <div className="hidden">{TAILWIND_SAFELIST}</div>
    </div>
  )
}

export default function WriteQuotePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-lg font-bold">Loading editor...</div>}>
      <WriteQuoteForm />
    </Suspense>
  )
}