'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Paintbrush } from 'lucide-react'

type Template = {
  id: string
  name: string
  style_config: { gradient?: string; baseColor?: string }
  image_url: string | null
  is_pro_only: boolean
}

export default function SinglePackPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  const formattedTitle = (id as string)
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  useEffect(() => {
    const fetchPackTemplates = async () => {
      const { data } = await supabase
        .from('templates')
        .select('*')
        .ilike('image_url', `%paid_templates/${id}/%`)
        .order('name', { ascending: true })

      if (data) setTemplates(data as Template[])
      setIsLoading(false)
    }
    fetchPackTemplates()
  }, [id, supabase])

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-white pb-24">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 pt-6 pb-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 bg-slate-50 hover:bg-slate-100 rounded-full transition">
            <ChevronLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{formattedTitle}</h1>
        </div>
      </div>

      {/* Template Grid */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {templates.map(template => (
            <div 
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer border border-slate-100 shadow-[0_4px_14px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out"
            >
              <img src={template.image_url!} alt={template.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/10 opacity-60 group-hover:opacity-80 transition-opacity"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                <h3 className="text-white font-bold text-sm sm:text-base leading-snug truncate drop-shadow-md">{template.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Minimal Preview Modal for inside the pack */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 transition-opacity">
          <div className="absolute inset-0" onClick={() => setSelectedTemplate(null)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-[32px] sm:rounded-[40px] p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 fade-in duration-300">
             <div className="w-full flex justify-center mb-6">
              <div className="w-[200px] aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 shadow-xl relative bg-slate-100">
                  <img src={selectedTemplate.image_url!} alt={selectedTemplate.name} className="absolute inset-0 w-full h-full object-cover" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 text-center mb-6">{selectedTemplate.name}</h3>
            <button 
              onClick={() => router.push(`/create?template=${selectedTemplate.id}`)}
              className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all shadow-md"
            >
              <Paintbrush className="w-5 h-5" />
              Use Template
            </button>
          </div>
        </div>
      )}

    </div>
  )
}