'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Search, Heart, Sparkles, Layers, Loader2, ChevronRight, X, Paintbrush } from 'lucide-react'

// --- Types ---
type Template = {
  id: string
  name: string
  style_config: { gradient?: string; baseColor?: string }
  image_url: string | null
  tags: string[]
  is_pro_only: boolean
  usage_count?: number
}

type Pack = {
  id: string
  name: string
  description: string
  cover_image_url: string
  is_pro: boolean
}

const FILTERS = ['All', 'Templates', 'Packs']

// Components
const TemplateCard = ({ 
  template, 
  isFav, 
  onClick, 
  onToggleFavorite,
  rank 
}: { 
  template: Template
  isFav?: boolean
  onClick: () => void
  onToggleFavorite: (e: React.MouseEvent, t: Template) => void
  rank?: number
}) => (
  <div 
    onClick={onClick}
    className="relative w-36 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 snap-start group cursor-pointer border border-slate-100 shadow-[0_4px_14px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out will-change-transform"
  >
    {template.image_url ? (
      <img src={template.image_url} alt={template.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
    ) : (
      <div className={`absolute inset-0 bg-gradient-to-br ${template.style_config?.gradient || 'from-slate-200 to-slate-300'}`}></div>
    )}
    
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/10 opacity-60 group-hover:opacity-80 transition-opacity"></div>
    
    {rank && (
      <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20 z-10 shadow-sm">
        <span className="text-white font-bold text-xs">{rank}</span>
      </div>
    )}

    <button 
      onClick={(e) => onToggleFavorite(e, template)}
      className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center border transition-all duration-200 z-10 hover:scale-110 active:scale-95 ${
        isFav 
          ? 'bg-white/30 border-white/40 shadow-sm' 
          : 'bg-black/20 border-white/20 hover:bg-black/40'
      }`}
    >
      <Heart className={`w-4 h-4 transition-colors ${isFav ? 'fill-white text-white' : 'text-white'}`} />
    </button>

    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex items-center justify-between gap-2">
      <h3 className="text-white font-bold text-sm sm:text-base leading-snug truncate drop-shadow-md">{template.name}</h3>
      {template.is_pro_only && (
        <Sparkles className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0 drop-shadow-md" />
      )}
    </div>
  </div>
)

const CarouselRow = ({ 
  title, 
  icon: Icon, 
  templates, 
  favorites, 
  onSelect, 
  onSeeAll,
  showRank,
  onToggleFavorite
}: { 
  title: string
  icon?: any
  templates: Template[]
  favorites: Template[]
  onSelect: (t: Template) => void
  onSeeAll?: () => void
  showRank?: boolean
  onToggleFavorite: (e: React.MouseEvent, t: Template) => void
}) => {
  if (templates.length === 0) return null
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between px-4 sm:px-6 mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-slate-800" />}
          <h2 className="font-black text-lg sm:text-xl text-slate-800 tracking-tight">{title}</h2>
        </div>
        {onSeeAll && (
          <button onClick={onSeeAll} className="text-sm font-bold text-slate-400 hover:text-black flex items-center transition-colors">
            See all <ChevronRight className="w-4 h-4 ml-0.5" />
          </button>
        )}
      </div>
      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 px-4 sm:px-6 pb-4 -mx-4 sm:mx-0">
        {templates.map((t, index) => (
           <TemplateCard 
             key={t.id} 
             template={t} 
             isFav={favorites.some(f => f.id === t.id)} 
             onClick={() => onSelect(t)} 
             onToggleFavorite={onToggleFavorite}
             rank={showRank ? index + 1 : undefined}
           />
        ))}
        <div className="w-2 shrink-0"></div>
      </div>
    </div>
  )
}

// Main Page
export default function TemplatesPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [userId, setUserId] = useState<string | null>(null)

  const [favorites, setFavorites] = useState<Template[]>([])
  const [allTemplates, setAllTemplates] = useState<Template[]>([])
  const [trendingTemplates, setTrendingTemplates] = useState<Template[]>([])

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const [recentRes, trendingRes, favsRes] = await Promise.all([
        supabase.from('templates').select('*').order('created_at', { ascending: false }),
        supabase.from('templates').select('*').gt('usage_count', 0).order('usage_count', { ascending: false }).limit(20),
        user ? supabase.from('user_template_interactions').select('template_id, templates(*)').eq('user_id', user.id).eq('is_favorite', true) : Promise.resolve({ data: null })
      ])

      if (recentRes.data) setAllTemplates(recentRes.data as Template[])
      if (trendingRes.data) setTrendingTemplates(trendingRes.data as Template[])

      if (favsRes.data) {
        const extractedFavs = favsRes.data.map((f: any) => f.templates).filter(Boolean)
        setFavorites(extractedFavs as Template[])
      }

      setIsLoading(false)
    }
    fetchData()
  }, [supabase])

  const packs = useMemo(() => {
    const packMap: Record<string, Pack> = {}
    allTemplates.forEach(t => {
      if (!t.image_url) return
      const match = t.image_url.match(/paid_templates\/([^/]+)\//)
      if (match && match[1]) {
        const packSlug = match[1]
        if (!packMap[packSlug]) {
          const formattedName = packSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          packMap[packSlug] = {
            id: packSlug,
            name: formattedName,
            description: `Collection of 10 ${formattedName} templates.`,
            cover_image_url: t.image_url,
            is_pro: t.is_pro_only
          }
        }
      }
    })
    return Object.values(packMap)
  }, [allTemplates])

  const templatePackMap = useMemo(() => {
    const map: Record<string, string> = {}
    allTemplates.forEach(t => {
      if (!t.image_url) return
      const match = t.image_url.match(/paid_templates\/([^/]+)\//)
      if (match && match[1]) map[t.id] = match[1]
    })
    return map
  }, [allTemplates])

  // Heart Toggler
  const handleToggleFavorite = async (e: React.MouseEvent, template: Template) => {
    e.stopPropagation()
    
    if (!userId) {
      alert("Please log in to save favorites.")
      return
    }

    const isFav = favorites.some(f => f.id === template.id)

    if (isFav) {
      setFavorites(prev => prev.filter(f => f.id !== template.id))
      await supabase.from('user_template_interactions').update({ is_favorite: false }).eq('user_id', userId).eq('template_id', template.id)
    } else {
      setFavorites(prev => [...prev, template])
      await supabase.from('user_template_interactions').upsert({ 
        user_id: userId, 
        template_id: template.id, 
        is_favorite: true,
        last_used_at: new Date().toISOString()
      }, { onConflict: 'user_id, template_id' })
    }
  }

  const toggleModalFavorite = (template: Template) => handleToggleFavorite({ stopPropagation: () => {} } as React.MouseEvent, template)

  const filteredTemplates = allTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  )

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-white pb-24">
      
      {/* Header & Search */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 pt-4 pb-2 px-4 sm:px-6 will-change-transform">
        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-full px-4 py-3 shadow-inner focus-within:ring-2 focus-within:ring-emerald-200 focus-within:border-emerald-300 transition-all mb-3">
          <Search className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates & packs..."
            className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
          {FILTERS.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
                activeFilter === filter 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        {searchQuery.length > 0 ? (
          <div className="px-4 sm:px-6 mt-6">
            <h2 className="font-black text-lg text-slate-800 mb-4">Results for "{searchQuery}"</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredTemplates.map(t => (
                <TemplateCard 
                  key={t.id} 
                  template={t} 
                  isFav={favorites.some(f => f.id === t.id)} 
                  onClick={() => setSelectedTemplate(t)} 
                  onToggleFavorite={handleToggleFavorite} 
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Favourites */}
            {userId && favorites.length > 0 && activeFilter !== 'Packs' && (
              <CarouselRow title="My Favorites" icon={Heart} templates={favorites} favorites={favorites} onSelect={setSelectedTemplate} onToggleFavorite={handleToggleFavorite} />
            )}

            {/* Packs View */}
            {(activeFilter === 'All' || activeFilter === 'Packs') && packs.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between px-4 sm:px-6 mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-slate-800" />
                    <h2 className="font-black text-lg sm:text-xl text-slate-800 tracking-tight">Template Packs</h2>
                  </div>
                  {activeFilter === 'All' && (
                     <button onClick={() => setActiveFilter('Packs')} className="text-sm font-bold text-slate-400 hover:text-black flex items-center transition-colors">
                       See all <ChevronRight className="w-4 h-4 ml-0.5" />
                     </button>
                  )}
                </div>
                
                {activeFilter === 'Packs' ? (
                  <div className="grid grid-cols-1 gap-4 px-4 sm:px-6">
                    {packs.map(pack => (
                      <div key={pack.id} onClick={() => setSelectedPack(pack)} className="relative w-full h-48 rounded-[28px] overflow-hidden group cursor-pointer shadow-sm border border-slate-100">
                        <img src={pack.cover_image_url || '/placeholder-pack.jpg'} alt={pack.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-5">
                          <h3 className="text-white font-black text-xl mb-1">{pack.name}</h3>
                          <p className="text-white/80 font-medium text-sm line-clamp-1">{pack.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 px-4 sm:px-6 pb-4 -mx-4 sm:mx-0">
                    {packs.map(pack => (
                      <div key={pack.id} onClick={() => setSelectedPack(pack)} className="relative w-72 h-44 rounded-[28px] overflow-hidden shrink-0 snap-center group cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300">
                        <img src={pack.cover_image_url || '/placeholder-pack.jpg'} alt={pack.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-5">
                          <h3 className="text-white font-black text-xl mb-1">{pack.name}</h3>
                          <p className="text-white/80 font-medium text-sm line-clamp-1">{pack.description}</p>
                        </div>
                      </div>
                    ))}
                    <div className="w-2 shrink-0"></div>
                  </div>
                )}
              </div>
            )}

            {/* Templates View */}
            {(activeFilter === 'All' || activeFilter === 'Templates') && (
              <>
                <CarouselRow 
                  title="Trending Right Now" 
                  templates={trendingTemplates} 
                  favorites={favorites} 
                  onSelect={setSelectedTemplate} 
                  onSeeAll={activeFilter === 'All' ? () => setActiveFilter('Templates') : undefined} 
                  showRank={true}
                  onToggleFavorite={handleToggleFavorite}
                />
                
                <CarouselRow 
                  title="Recently Added" 
                  templates={allTemplates.slice(0, 20)} 
                  favorites={favorites} 
                  onSelect={setSelectedTemplate} 
                  onSeeAll={activeFilter === 'All' ? () => setActiveFilter('Templates') : undefined} 
                  onToggleFavorite={handleToggleFavorite}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Template Preview */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 transition-opacity">
          <div className="absolute inset-0" onClick={() => setSelectedTemplate(null)}></div>
          
            <div className="relative w-full max-w-sm bg-white rounded-[32px] sm:rounded-[40px] p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 fade-in duration-300">
             <div className="w-full flex justify-center mb-6">
            <div className="w-[200px] aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 shadow-xl relative bg-slate-100">
                {selectedTemplate.image_url ? (
                <img 
                    src={selectedTemplate.image_url} 
                    alt={selectedTemplate.name} 
                    className="absolute inset-0 w-full h-full object-cover" 
                />
                ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${selectedTemplate.style_config?.gradient || 'from-slate-200 to-slate-300'}`} />
                )}
            </div>
            </div>

            <h3 className="text-2xl font-black text-slate-800 text-center mb-6">{selectedTemplate.name}</h3>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => router.push(`/create?template=${selectedTemplate.id}`)}
                className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all shadow-md hover:shadow-lg"
              >
                <Paintbrush className="w-5 h-5" />
                Use Template
              </button>
              
              <div className="flex gap-3">
                {templatePackMap[selectedTemplate.id] && (
                  <button 
                    onClick={() => {
                      setSelectedTemplate(null)
                      const targetPack = packs.find(p => p.id === templatePackMap[selectedTemplate.id])
                      if (targetPack) setSelectedPack(targetPack)
                    }}
                    className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold py-3.5 rounded-2xl hover:bg-emerald-100 active:scale-95 transition-all"
                  >
                    View Pack
                  </button>
                )}

                <button 
                  onClick={() => toggleModalFavorite(selectedTemplate)}
                  className={`flex-1 flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl border transition-all active:scale-95 ${
                    favorites.some(f => f.id === selectedTemplate.id) 
                      ? 'bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${favorites.some(f => f.id === selectedTemplate.id) ? 'fill-rose-500' : ''}`} />
                  {favorites.some(f => f.id === selectedTemplate.id) ? 'Saved' : 'Favorite'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Pack Preview Modal */}
      {selectedPack && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-6 transition-opacity">
          <div className="absolute inset-0" onClick={() => setSelectedPack(null)}></div>
          
          <div className="relative w-full max-w-2xl bg-white rounded-t-[32px] sm:rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 fade-in duration-300 flex flex-col max-h-[90vh]">
            
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{selectedPack.name}</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">{selectedPack.description}</p>
              </div>
              <button onClick={() => setSelectedPack(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {allTemplates
                .filter(t => templatePackMap[t.id] === selectedPack.id)
                .map(t => (
                  <TemplateCard 
                    key={t.id} 
                    template={t} 
                    isFav={favorites.some(f => f.id === t.id)} 
                    onClick={() => setSelectedTemplate(t)}
                    onToggleFavorite={handleToggleFavorite} 
                  />
                ))}
            </div>
            
          </div>
        </div>
      )}

    </div>
  )
}