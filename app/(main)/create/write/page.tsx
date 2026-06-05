'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'

const TEMPLATES = [
  { id: 'clown', name: 'Clown', color: 'bg-orange-200' },
  { id: 'comedian', name: 'Comedian', color: 'bg-yellow-200' },
  { id: 'embarrassed', name: 'Embarrassed', color: 'bg-slate-300' },
]

function WriteQuoteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const targetId = searchParams.get('targetId')
  const targetUsername = searchParams.get('targetUsername')
  const inviteEmail = searchParams.get('inviteEmail')

  const isExistingUser = !!targetId
  const displayTarget = targetUsername || inviteEmail || 'Unknown'

  const [quoteText, setQuoteText] = useState('')
  const [bgType, setBgType] = useState<'avatar' | 'template' | 'snap'>(
    isExistingUser ? 'avatar' : 'template'
  )
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id)

  return (
    <div className="flex flex-col pt-10 px-6 w-full max-w-lg mx-auto min-h-[calc(100vh-120px)] pb-6">
      
      {/* Header - Super Sized */}
      <div className="relative text-center mb-10 shrink-0">
        <button 
          onClick={() => router.back()}
          aria-label="Go back"
          className="absolute left-0 top-1 p-3 hover:bg-slate-100 rounded-full transition"
        >
          <ArrowLeft className="w-10 h-10 text-black" />
        </button>
        <h1 className="text-4xl font-black text-black">PinQuo</h1>
        <p className="text-slate-500 font-bold text-lg mt-2">Quoting {displayTarget}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start gap-8">
        
        {/* SNAP PRO - Now a massive, clear button */}
        <div className="flex flex-col items-center shrink-0 w-full">
          <Camera className="w-20 h-20 text-black mb-4" strokeWidth={2} />
          <button 
            type="button"
            className="w-full max-w-[360px] bg-slate-200 text-slate-800 font-black py-5 px-10 rounded-[28px] text-xl hover:bg-slate-300 transition shadow-sm"
          >
            Snap Live-Photo (PRO)
          </button>
        </div>

        {/* AVATAR OPTION */}
        {isExistingUser && (
          <div className="w-full flex flex-col items-center shrink-0">
            <div className="text-slate-400 font-black text-lg mb-4 uppercase tracking-widest">Or</div>
            <button
              type="button"
              onClick={() => setBgType('avatar')}
              className={`w-full max-w-[360px] py-6 rounded-[28px] font-black text-xl transition-all ${
                bgType === 'avatar' 
                  ? 'bg-[#bbf7d0] text-emerald-950 shadow-md ring-4 ring-emerald-200' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Use Quoted Users Avatar
            </button>
          </div>
        )}

        <div className="text-slate-400 font-black text-lg uppercase tracking-widest shrink-0">Or</div>

        {/* TEMPLATE CAROUSEL - Significantly larger thumbnails */}
        <div className="w-full flex flex-col items-center shrink-0">
          <p className="text-2xl font-black text-slate-800 mb-6">Choose template</p>
          
          <div className="flex items-center justify-center gap-6 w-full">
            <ChevronLeft className="w-12 h-12 text-black cursor-pointer hover:scale-110 transition" />
            
            <div className="flex gap-6">
              {TEMPLATES.map((template) => {
                const isSelected = bgType === 'template' && selectedTemplate === template.id
                return (
                  <div key={template.id} onClick={() => { setBgType('template'); setSelectedTemplate(template.id) }} className="flex flex-col items-center gap-3 cursor-pointer group">
                    <div className={`relative w-28 h-28 rounded-[32px] overflow-hidden ${template.color} border-4px transition-all ${isSelected ? 'border-emerald-400 scale-110 shadow-lg' : 'border-transparent group-hover:scale-105'}`}>
                      {isSelected && (
                        <div className="absolute inset-0 bg-white/30 flex items-center justify-center">
                          <div className="bg-[#bbf7d0] rounded-full p-2 border-4 border-emerald-500"><CheckCircle2 className="w-10 h-10 text-emerald-800" strokeWidth={3} /></div>
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-black text-slate-500 uppercase">{template.name}</span>
                  </div>
                )
              })}
            </div>
            <ChevronRight className="w-12 h-12 text-black cursor-pointer hover:scale-110 transition" />
          </div>
        </div>

        {/* QUOTE INPUT SECTION - Massive and easy to touch */}
        <div className="w-full mt-auto pt-8 shrink-0">
          <p className="text-2xl font-black text-slate-800 mb-4 text-center">Quote:</p>
          <div className="relative w-full bg-slate-100 rounded-[40px] p-8 pb-32 shadow-inner">
            <span className="absolute top-8 left-8 text-7xl font-serif text-slate-400">&ldquo;</span>
            <textarea
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              placeholder="Type the quote here..."
              className="w-full h-32 bg-transparent text-slate-900 text-2xl resize-none focus:outline-none placeholder:text-slate-400 pl-16 pr-10 pt-4 leading-normal font-medium"
            />
            <span className="absolute bottom-[130px] right-8 text-7xl font-serif text-slate-400">&rdquo;</span>

            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
              <button
                disabled={quoteText.trim().length === 0}
                className="bg-[#bbf7d0] text-emerald-950 font-black py-5 px-20 rounded-full disabled:opacity-50 transition hover:bg-[#a7f3d0] active:scale-95 shadow-md text-xl"
              >
                Preview
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function WriteQuotePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500 text-xl">Loading editor...</div>}>
      <WriteQuoteForm />
    </Suspense>
  )
}