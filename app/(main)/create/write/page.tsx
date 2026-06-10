'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// knows not to delete them when it compiles the app!
const TAILWIND_SAFELIST = "bg-orange-200 bg-yellow-200 bg-slate-300 bg-slate-200 from-orange-200 to-red-200 from-yellow-200 to-amber-200 from-slate-300 to-slate-400"

type Template = {
  id: string
  name: string
  style_config: {
    baseColor: string
    gradient: string
  }
  is_pro_only: boolean
}

function WriteQuoteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const targetId = searchParams.get('targetId')
  const targetUsername = searchParams.get('targetUsername')
  const inviteEmail = searchParams.get('inviteEmail')

  const isExistingUser = !!targetId
  const displayTarget = targetUsername || inviteEmail || 'Unknown'

  const [quoteText, setQuoteText] = useState('')
  const [bgType, setBgType] = useState<'avatar' | 'template' | 'snap'>(
    isExistingUser ? 'avatar' : 'template'
  )

  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('id, name, style_config, is_pro_only')
        .eq('is_pro_only', false)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        setTemplates(data)
        setSelectedTemplate(data[0])
      }
      setIsLoadingTemplates(false)
    }
    fetchTemplates()
  }, [supabase])

  const handlePreview = () => {
    if (!quoteText.trim()) return

    const params = new URLSearchParams({ quote: quoteText, bgType: bgType })

    if (targetId) params.append('targetId', targetId)
    if (targetUsername) params.append('targetUsername', targetUsername)
    if (inviteEmail) params.append('inviteEmail', inviteEmail)
    
    if (bgType === 'template' && selectedTemplate) {
      params.append('templateId', selectedTemplate.id)
      params.append('templateGradient', selectedTemplate.style_config.gradient)
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

        {/* TEMPLATE CAROUSEL */}
        <div className="w-full flex flex-col items-center shrink-0 mt-2">
          <p className="text-xl font-black text-slate-800 mb-4">Choose template</p>
          
          {isLoadingTemplates ? (
            <Loader2 className="w-8 h-8 animate-spin text-slate-300 my-4" />
          ) : templates.length > 0 ? (
            <div className="flex items-center justify-center gap-2 w-full">
              <ChevronLeft className="w-8 h-8 text-black cursor-pointer hover:scale-110 transition" />
              
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-2 items-center justify-center">
                {templates.map((template) => {
                  const isSelected = bgType === 'template' && selectedTemplate?.id === template.id
                  const baseColor = template.style_config?.baseColor || 'bg-slate-200'
                  
                  return (
                    <div key={template.id} onClick={() => { setBgType('template'); setSelectedTemplate(template) }} className="flex flex-col items-center gap-2 cursor-pointer group shrink-0">
                      <div className={`relative w-20 h-20 rounded-[24px] overflow-hidden ${baseColor} border-4 transition-all ${isSelected ? 'border-emerald-400 scale-105 shadow-md' : 'border-transparent group-hover:scale-105'}`}>
                        {isSelected && (
                          <div className="absolute inset-0 bg-white/30 flex items-center justify-center">
                            <div className="bg-[#bbf7d0] rounded-full p-1.5 border-[3px] border-emerald-500"><CheckCircle2 className="w-8 h-8 text-emerald-800" strokeWidth={3} /></div>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wide">{template.name}</span>
                    </div>
                  )
                })}
              </div>

              <ChevronRight className="w-8 h-8 text-black cursor-pointer hover:scale-110 transition" />
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
      
      {/* Hide safelist from DOM but keep it compiled */}
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