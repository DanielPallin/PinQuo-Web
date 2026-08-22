'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera, ArrowLeft, Loader2, Sparkles, User as UserIcon, X, Lock, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const TAILWIND_SAFELIST = "bg-orange-200 bg-yellow-200 bg-slate-300 bg-slate-200 from-orange-200 to-red-200 from-yellow-200 to-amber-200 from-slate-300 to-slate-400"

type AccessTier = 'free' | 'pro'
type FilterState = 'all' | 'favorites' | 'packs'

type Template = {
  id: string
  name: string
  style_config: {
    baseColor?: string
    gradient: string
  }
  access_tier?: AccessTier 
  image_url?: string 
  category?: string 
  computed_tier?: AccessTier
  computed_pack_name?: string
}

type DerivedPack = {
  name: string
  cover_image_url: string | null
  is_pro: boolean
  templates: Template[]
}

const canAccessTemplate = (isProUser: boolean, itemTier: AccessTier) => {
  return itemTier === 'pro' ? isProUser : true
}

const extractPackNameFromUrl = (url: string | undefined): string | null => {
  if (!url) return null
  const match = url.match(/(?:paid_templates|free_templates)\/([^\/]+)/)
  if (match && match[1]) {
    return match[1]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return null
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
  const [bgType, setBgType] = useState<'avatar' | 'template' | 'snap'>(isExistingUser ? 'avatar' : 'template')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterState>('packs')

  const [isProUser, setIsProUser] = useState(false)
  const [allTemplates, setAllTemplates] = useState<Template[]>([])
  const [packs, setPacks] = useState<DerivedPack[]>([])
  const [favorites, setFavorites] = useState<Template[]>([])
  const [isLoadingCore, setIsLoadingCore] = useState(true)
  const carouselRef = useRef<HTMLDivElement>(null)

  const [activePack, setActivePack] = useState<DerivedPack | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchCoreData = async () => {
      setIsLoadingCore(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('access_tier').eq('id', user.id).single()
        if (isMounted && profile) {
          setIsProUser(profile.access_tier === 'pro')
        }

        const { data: favData } = await supabase
          .from('user_template_interactions')
          .select('template_id, templates(*)')
          .eq('user_id', user.id)
          .eq('is_favorite', true)
        
        if (isMounted && favData) {
          const formattedFavs = favData.map(f => f.templates as unknown as Template).filter(Boolean)
          setFavorites(formattedFavs)
        }
      }

      const { data: templatesData } = await supabase.from('templates').select('*').order('created_at', { ascending: true })

      if (isMounted && templatesData) {
        const packMap = new Map<string, DerivedPack>()
        const processedTemplates: Template[] = []

        ;(templatesData as Template[]).forEach((t) => {
          const isPaidFolder = t.image_url?.includes('paid_templates')
          const computedTier: AccessTier = isPaidFolder ? 'pro' : (t.access_tier === 'pro' ? 'pro' : 'free')
          
          const parsedFolderName = extractPackNameFromUrl(t.image_url)
          let packName = parsedFolderName || t.category

          if (!packName || packName.toLowerCase() === 'general') {
            packName = computedTier === 'free' ? 'Starter Collection' : 'Pro Collection'
          }

          t.computed_tier = computedTier
          t.computed_pack_name = packName
          processedTemplates.push(t)

          if (!packMap.has(packName)) {
            packMap.set(packName, {
              name: packName,
              cover_image_url: t.image_url || null, 
              is_pro: computedTier === 'pro', 
              templates: []
            })
          } else if (computedTier === 'pro') {
            packMap.get(packName)!.is_pro = true
          }
          
          packMap.get(packName)!.templates.push(t)
        })

        setAllTemplates(processedTemplates)
        setPacks(Array.from(packMap.values()))
      }

      if (isMounted) setIsLoadingCore(false)
    }

    fetchCoreData()
    return () => { isMounted = false }
  }, [supabase])

  // Sorting & Filtering
  const lowercaseQuery = searchQuery.toLowerCase().trim()
  
  const sortUnlockedFirst = (aAccess: boolean, bAccess: boolean) => {
    if (aAccess && !bAccess) return -1
    if (!aAccess && bAccess) return 1
    return 0
  }

  const baseSortedTemplates = allTemplates
    .filter(t => t.name.toLowerCase().includes(lowercaseQuery) || (t.computed_pack_name?.toLowerCase().includes(lowercaseQuery)))
    .sort((a, b) => sortUnlockedFirst(canAccessTemplate(isProUser, a.computed_tier || 'free'), canAccessTemplate(isProUser, b.computed_tier || 'free')))

  const sortedTemplates = (() => {
    if (bgType === 'template' && selectedTemplate) {
      const filtered = baseSortedTemplates.filter(t => t.id !== selectedTemplate.id)
      return [selectedTemplate, ...filtered]
    }
    return baseSortedTemplates
  })()

  const sortedPacks = packs
    .filter(p => p.name.toLowerCase().includes(lowercaseQuery))
    .sort((a, b) => sortUnlockedFirst(!a.is_pro || isProUser, !b.is_pro || isProUser))

  const filteredFavorites = favorites.filter(t => t.name.toLowerCase().includes(lowercaseQuery))

  const handleSelectTemplate = (template: Template) => {
    setBgType('template')
    setSelectedTemplate(template)
    setActivePack(null)
    setActiveFilter('all') 
    
    if (carouselRef.current) {
      setTimeout(() => {
        carouselRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
      }, 50)
    }
  }

  const handleLockedClick = (template: Template) => {
    const parentPack = packs.find(p => p.name === template.computed_pack_name)
    if (parentPack) setActivePack(parentPack)
  }

  const handlePreview = () => {
    if (!quoteText.trim()) return
    const params = new URLSearchParams({ quote: quoteText, bgType: bgType })

    if (targetId) params.append('targetId', targetId)
    if (targetUsername) params.append('targetUsername', targetUsername)
    if (inviteEmail) params.append('inviteEmail', inviteEmail)
    if (customName) params.append('customName', customName)
    
    if (bgType === 'template' && selectedTemplate) {
      params.append('templateId', selectedTemplate.id)
      if (selectedTemplate.style_config?.gradient) params.append('templateGradient', selectedTemplate.style_config.gradient)
      if (selectedTemplate.image_url) params.append('templateImageUrl', selectedTemplate.image_url)
    }

    router.push(`/create/preview?${params.toString()}`)
  }

  const isFormValid = quoteText.trim().length > 0 && (bgType !== 'template' || !!selectedTemplate)
  const isPackLocked = activePack && activePack.is_pro && !isProUser

  const renderTemplateCard = (template: Template, isGrid: boolean = false) => {
    const isSelected = bgType === 'template' && selectedTemplate?.id === template.id
    const itemTier = template.computed_tier || 'free'
    const isLocked = !canAccessTemplate(isProUser, itemTier)

    const sizingClasses = isGrid 
      ? 'w-full aspect-[3/4]' 
      : 'shrink-0 w-[100px] h-[130px] snap-start'

    return (
      <button
        key={template.id}
        onClick={() => isLocked ? handleLockedClick(template) : handleSelectTemplate(template)}
        className={`relative rounded-[20px] overflow-hidden transition-all duration-200 group ${sizingClasses} ${
          isSelected 
            ? 'ring-4 ring-emerald-400 scale-[1.02] shadow-lg z-10' 
            : isLocked 
              ? 'grayscale opacity-60 hover:opacity-80 border-2 border-slate-200' 
              : 'opacity-90 hover:opacity-100 border border-slate-200 shadow-sm'
        }`}
      >
        {template.image_url ? (
          <img src={template.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous"/>
        ) : (
          <div className={`absolute inset-0 bg-linear-to-br ${template.style_config?.gradient || 'from-slate-200 to-slate-300'}`}></div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
        
        {isLocked && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/20 shadow-sm">
            <Lock className="w-3 h-3 text-white" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 w-full p-2 text-center text-[10px] sm:text-xs font-black uppercase tracking-wide text-white truncate drop-shadow-md">
          {template.name}
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col pt-6 w-full max-w-2xl mx-auto min-h-[100dvh] bg-[#f8fafc] relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-700 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black text-slate-900">PinQuo</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Editor</p>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="flex flex-col w-full z-10">
        
        {/* Quote Input Area */}
        <div className="px-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-slate-800 ml-1">What did <span className="text-emerald-600">{displayTarget}</span> say?</label>
          </div>
          <div className="relative w-full bg-white rounded-[32px] p-6 shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-slate-100 focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-100 transition-all">
            <span className="absolute top-4 left-4 text-4xl font-serif font-black text-slate-200 select-none">“</span>
            <textarea
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              placeholder="Type the quote here..."
              className="w-full h-28 bg-transparent text-slate-900 text-xl md:text-2xl font-medium resize-none focus:outline-none placeholder:text-slate-300 px-6 py-2 leading-snug font-serif"
            />
            <span className="absolute bottom-2 right-4 text-4xl font-serif font-black text-slate-200 select-none">”</span>
          </div>
        </div>

        {/* Backgrounds Section */}
        <div className="w-full flex flex-col">
          <div className="px-4 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-slate-800" />
              <h3 className="text-lg font-black text-slate-900">Backgrounds</h3>
            </div>
          </div>

          <div className="px-4 mb-4">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates, packs, or vibes..." 
                className="w-full bg-white border border-slate-200 rounded-full py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
            {(['all', 'favorites', 'packs'] as FilterState[]).map(filter => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                  activeFilter === filter 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Carousel */}
          <div 
            ref={carouselRef} 
            className="relative w-full flex overflow-x-auto snap-x snap-mandatory pt-4 pb-8 px-4 gap-3 no-scrollbar items-center"
          >
            
            {/* Live Snap (Locked) */}
            <div className="relative shrink-0 w-[100px] h-[130px] rounded-[20px] border-2 border-dashed border-slate-300 bg-white/50 flex flex-col items-center justify-center opacity-60 snap-start cursor-not-allowed">
              <Camera className="w-6 h-6 text-slate-400 mb-2" strokeWidth={2.5} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight">Live<br/>Snap</span>
              <div className="absolute -top-2 right-0 bg-slate-300 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm border border-white">v2.0</div>
            </div>

            {/* Quoted User Avatar */}
            {isExistingUser && (
              <button
                onClick={() => setBgType('avatar')}
                className={`relative shrink-0 w-[100px] h-[130px] rounded-[20px] flex flex-col items-center justify-center snap-start transition-all duration-200 ${
                  bgType === 'avatar' ? 'ring-4 ring-emerald-400 scale-[1.02] shadow-md bg-emerald-50 border-none' : 'bg-white border-2 border-slate-200 shadow-sm opacity-90 hover:opacity-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${bgType === 'avatar' ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  <UserIcon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest text-center leading-tight ${bgType === 'avatar' ? 'text-emerald-800' : 'text-slate-500'}`}>Use<br/>Avatar</span>
              </button>
            )}

            <div className="shrink-0 w-[2px] h-20 bg-slate-200 mx-1 rounded-full"></div>

            {isLoadingCore ? (
              <div className="w-[100px] h-[130px] flex items-center justify-center shrink-0">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : (
              <>
                {activeFilter === 'all' && sortedTemplates.map(t => renderTemplateCard(t, false))}
                
                {activeFilter === 'favorites' && filteredFavorites.length === 0 && (
                  <div className="w-[200px] text-sm font-bold text-slate-400 text-center flex items-center justify-center">No favorites pinned yet.</div>
                )}
                {activeFilter === 'favorites' && filteredFavorites.map(t => renderTemplateCard(t, false))}

                {activeFilter === 'packs' && sortedPacks.map(pack => {
                  const isLocked = pack.is_pro && !isProUser
                  return (
                    <button
                      key={`pack-${pack.name}`}
                      onClick={() => setActivePack(pack)}
                      className={`relative shrink-0 w-[100px] h-[130px] rounded-[20px] overflow-hidden snap-start transition-all duration-200 border-2 border-slate-200 group ${isLocked ? 'grayscale opacity-70 hover:opacity-90' : 'shadow-sm hover:shadow-md'}`}
                    >
                      {pack.cover_image_url ? (
                        <img src={pack.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
                      ) : (
                        <div className="absolute inset-0 bg-slate-200"></div>
                      )}
                      <div className="absolute top-1.5 left-1.5 right-1.5 bottom-1.5 border border-white/40 rounded-xl pointer-events-none z-10"></div>
                      
                      {isLocked ? (
                        <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-20">
                          <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full mb-1 border border-white/10">
                            <Lock className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-[9px] font-black text-white uppercase tracking-widest mt-1 text-center leading-tight drop-shadow-md">{pack.name}</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col items-center justify-end pb-2 z-20">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md text-center leading-tight px-1">{pack.name}</span>
                          <span className="text-[7px] font-bold text-slate-300 uppercase mt-0.5">{pack.templates.length} Items</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 w-full px-4 pt-8">
        <button
          onClick={handlePreview}
          disabled={!isFormValid}
          className="w-full bg-[#bbf7d0] text-emerald-950 hover:bg-[#86efac] active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-[#bbf7d0] disabled:active:scale-100 font-black text-xl py-4 px-6 rounded-full transition-all duration-200 shadow-lg shadow-emerald-200/50 border-4 border-emerald-200 flex items-center justify-center"
        >
          Preview
        </button>
      </div>

      {/* Sheet drawer */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${activePack ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setActivePack(null)}
      ></div>
      
      <div className={`fixed bottom-0 left-0 right-0 ${isPackLocked ? 'h-auto pb-8' : 'h-[70vh]'} bg-white rounded-t-[40px] z-50 transition-transform duration-300 ease-in-out flex flex-col shadow-2xl ${activePack ? 'translate-y-0' : 'translate-y-full'}`}>
        
        <div className="flex items-center justify-between p-6 pb-2 border-b border-slate-100 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-900">{activePack?.name}</h2>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {activePack?.is_pro ? 'Pro Collection' : 'Free Collection'}
            </span>
          </div>
          <button onClick={() => setActivePack(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 no-scrollbar relative">
          
          {isPackLocked ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mb-4 border border-yellow-100">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Unlock {activePack?.name}</h3>
              <p className="text-slate-500 font-medium mb-8">Upgrade to <span className="font-bold text-slate-700">Pro</span> to use this template and 100+ more.</p>
              
              <button 
                onClick={() => router.push('/settings')} 
                className="w-full max-w-[250px] bg-[#ffcc00] text-yellow-950 font-black py-4 px-6 rounded-full shadow-sm hover:scale-105 transition-transform uppercase tracking-wide mb-5"
              >
                Upgrade to Pro
              </button>

              <div className="h-px w-3/4 bg-slate-100 mb-4"></div>
              
              <p className="text-sm font-bold text-slate-400">
                Or buy this specific pack in the <button onClick={() => router.push('/store')} className="text-emerald-500 hover:underline">Store</button>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 pb-24 px-1">
              {activePack?.templates.map(t => renderTemplateCard(t, true))}
            </div>
          )}
        </div>
      </div>
      <div className="hidden">{TAILWIND_SAFELIST}</div>
    </div>
  )
}

export default function WriteQuotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>}>
      <WriteQuoteForm />
    </Suspense>
  )
}