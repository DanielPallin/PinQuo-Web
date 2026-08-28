'use client'

import { useState, useEffect, Suspense, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera, ArrowLeft, Loader2, Sparkles, ChevronRight, User as UserIcon, X, Lock, Search, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import WitnessManager, { Witness } from '@/components/WitnessManager'

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

// 💥 FIX 1: Made regex more resilient to bucket name changes
const extractPackNameFromUrl = (url: string | undefined): string | null => {
  if (!url) return null
  const match = url.match(/(?:paid_templates|free_templates|templates)\/([^\/]+)/)
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
  
  // 💥 FIX 2: Memoize the Supabase client to prevent infinite re-render loops in hooks
  const supabase = useMemo(() => createClient(), [])
  
  // WebRTC
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [snapImageUrl, setSnapImageUrl] = useState<string | null>(null)

  // Quote State
  const targetId = searchParams.get('targetId')
  const targetUsername = searchParams.get('targetUsername')
  const inviteEmail = searchParams.get('inviteEmail')
  const customName = searchParams.get('customName') 
  const isExistingUser = !!targetId
  const displayTarget = targetUsername || customName || inviteEmail || 'Unknown'

  const [quoteText, setQuoteText] = useState('')
  const [witnesses, setWitnesses] = useState<Witness[]>([])
  const [bgType, setBgType] = useState<'avatar' | 'template' | 'snap'>(isExistingUser ? 'avatar' : 'template')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  const [isHydrated, setIsHydrated] = useState(false)
  const draftKey = `pinquo_draft_${targetId || targetUsername || inviteEmail || customName || 'unknown'}`

  // Draft Hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = sessionStorage.getItem(draftKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.quoteText) setQuoteText(parsed.quoteText)
          if (parsed.witnesses) setWitnesses(parsed.witnesses)
          if (parsed.selectedTemplate) setSelectedTemplate(parsed.selectedTemplate)
          
          if (parsed.bgType === 'snap') {
            setBgType(isExistingUser ? 'avatar' : 'template')
          } else if (parsed.bgType) {
            setBgType(parsed.bgType)
          }
        } catch (e) {
          console.error("Failed to parse draft", e)
        }
      }
      setIsHydrated(true)
    }, 0)

    return () => clearTimeout(timer)
  }, [draftKey, isExistingUser])

  const [targetAvatarUrl, setTargetAvatarUrl] = useState<string | null>(null)

  // Fetch Target User's Avatar for the button preview
  useEffect(() => {
    let isMounted = true
    if (targetId) {
      const fetchTargetAvatar = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', targetId)
          .single()
          
        if (isMounted && data?.avatar_url) {
          setTargetAvatarUrl(data.avatar_url)
        }
      }
      fetchTargetAvatar()
    }
    return () => { isMounted = false }
  }, [targetId, supabase])

  // Draft Saving
  useEffect(() => {
    if (isHydrated) {
      sessionStorage.setItem(draftKey, JSON.stringify({
        quoteText,
        witnesses,
        bgType: bgType === 'snap' ? 'template' : bgType,
        selectedTemplate,
      }))
    }
  }, [quoteText, witnesses, bgType, selectedTemplate, draftKey, isHydrated])

  // UI Data
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterState>('packs')

  const [isGuest, setIsGuest] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLogin, setIsLogin] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [isProUser, setIsProUser] = useState(false)
  const [allTemplates, setAllTemplates] = useState<Template[]>([])
  const [packs, setPacks] = useState<DerivedPack[]>([])
  const [favorites, setFavorites] = useState<Template[]>([])
  const [isLoadingCore, setIsLoadingCore] = useState(true)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activePack, setActivePack] = useState<DerivedPack | null>(null)

  // Fetch
  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setIsGuest(false)
      const { data: profile } = await supabase.from('profiles').select('access_tier').eq('id', user.id).single()
      if (profile) setIsProUser(profile.access_tier === 'pro')

      const { data: favData } = await supabase
        .from('user_template_interactions')
        .select('template_id, templates(*)')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
      
      if (favData) {
        const formattedFavs = favData.map(f => f.templates as unknown as Template).filter(Boolean)
        setFavorites(formattedFavs)
      }
    } else {
      setIsGuest(true)
      setIsProUser(false)
      setFavorites([])
    }
  }, [supabase])

  useEffect(() => {
    let isMounted = true
    const fetchCoreData = async () => {
      setIsLoadingCore(true)
      await fetchUserData()

      const { data: templatesData } = await supabase.from('templates').select('*').order('created_at', { ascending: true })

      if (isMounted && templatesData) {
        const packMap = new Map<string, DerivedPack>()
        const processedTemplates: Template[] = []

        ;(templatesData as Template[]).forEach((t) => {
          // 💥 FIX 3: Stripped out frontend folder-sniffing completely. 
          // It now purely trusts whatever is in your database's `access_tier` column.
          const computedTier: AccessTier = t.access_tier === 'pro' ? 'pro' : 'free'
          
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
  }, [supabase, fetchUserData])

  const handleInContextAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    
    const { error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { username: authEmail.split('@')[0] } } })

    if (!error) {
      setShowAuthModal(false)
      await fetchUserData()
    } else {
      alert(error.message)
    }
    setAuthLoading(false)
  }

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

  const startCamera = () => {
    setIsCameraActive(true)
  }

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    if (isCameraActive) {
      const initCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: 'environment' } },
            audio: false
          })
          streamRef.current = stream
          activeStream = stream
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        } catch (err) {
          console.error("Camera access denied or hardware not found", err)
          alert("We need camera access to take a Live Snap!")
          setIsCameraActive(false)
        }
      }
      initCamera()
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isCameraActive])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }, [])

  const handleTakeSnap = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      setSnapImageUrl(url)
      
      setBgType('snap')
      setSelectedTemplate(null)
      setActivePack(null)
      
      stopCamera()
    }, 'image/jpeg', 0.9)
    
  }, [stopCamera])

  // Selections & Routing
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
    
    if (witnesses && witnesses.length > 0) {
      params.append('witnesses', JSON.stringify(witnesses))
    }
    
    if (bgType === 'template' && selectedTemplate) {
      params.append('templateId', selectedTemplate.id)
      if (selectedTemplate.style_config?.gradient) params.append('templateGradient', selectedTemplate.style_config.gradient)
      if (selectedTemplate.image_url) params.append('templateImageUrl', selectedTemplate.image_url)
    }

    if (bgType === 'snap' && snapImageUrl) {
      params.append('snapImageUrl', snapImageUrl)
    }

    router.push(`/create/preview?${params.toString()}`)
  }
  
  const isFormValid = quoteText.trim().length > 0 && (
    (bgType === 'template' && !!selectedTemplate) || 
    (bgType === 'avatar') ||
    (bgType === 'snap' && !!snapImageUrl)
  )

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
        className={`relative rounded-[20px] overflow-hidden transition-all duration-200 group will-change-transform ${sizingClasses} ${
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
          <div className={`absolute inset-0 bg-gradient-to-br ${template.style_config?.gradient || 'from-slate-200 to-slate-300'}`}></div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
        
        {isLocked && (
          <div className="absolute top-2 right-2 bg-black/80 md:bg-black/50 md:backdrop-blur-md p-1.5 rounded-full border border-white/20 shadow-sm will-change-transform">
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
      
      {/* Hardware Viewfinder */}
      {isCameraActive && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
            <h2 className="text-white font-black text-xl tracking-tight drop-shadow-md">Live Snap</h2>
            <button onClick={stopCamera} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white active:scale-95">
              <X className="w-6 h-6" />
            </button>
          </div>

          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute bottom-0 left-0 right-0 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 flex justify-center bg-gradient-to-t from-black/80 to-transparent z-10">
            <button onClick={handleTakeSnap} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform">
              <div className="w-full h-full bg-white rounded-full"></div>
            </button>
          </div>
        </div>
      )}

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
            <WitnessManager witnesses={witnesses} onChange={setWitnesses} />
          </div>
        </div>

        {/* Backgrounds Section */}
        <div className="w-full flex flex-col">
          <div className="flex items-center justify-between mb-4 px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-slate-800" />
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Backgrounds</h2>
            </div>
            <button 
              onClick={() => router.push('/templates')}
              className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-emerald-600 transition-colors group"
            >
              Manage 
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
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
            <button 
              onClick={startCamera}
              className={`relative shrink-0 w-[100px] h-[130px] rounded-[20px] flex flex-col items-center justify-center snap-start transition-all duration-200 overflow-hidden ${
                bgType === 'snap' 
                  ? 'ring-4 ring-emerald-400 scale-[1.02] shadow-md bg-emerald-50 border-none' 
                  : 'bg-white border-2 border-slate-200 shadow-sm opacity-90 hover:opacity-100'
              }`}
            >
              <Camera className={`w-6 h-6 mb-2 relative z-10 ${bgType === 'snap' ? 'text-white drop-shadow-md' : 'text-slate-400'}`} strokeWidth={2.5} />
              <span className={`text-[10px] font-black uppercase tracking-widest text-center leading-tight relative z-10 ${bgType === 'snap' ? 'text-white drop-shadow-md' : 'text-slate-400'}`}>Live<br/>Snap</span>

              {bgType === 'snap' && snapImageUrl && (
                <div className="absolute inset-0 z-0">
                  <img src={snapImageUrl} alt="snap" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-emerald-900/40 mix-blend-multiply"></div>
                </div>
              )}
            </button>

            {/* Quoted User Avatar */}
            {isExistingUser && (
              <button
                onClick={() => setBgType('avatar')}
                className={`relative shrink-0 w-[100px] h-[130px] rounded-[20px] flex flex-col items-center justify-center snap-start transition-all duration-200 overflow-hidden ${
                  bgType === 'avatar' ? 'ring-4 ring-emerald-400 scale-[1.02] shadow-md bg-emerald-50 border-none' : 'bg-white border-2 border-slate-200 shadow-sm opacity-90 hover:opacity-100'
                }`}
              >
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center mb-2 overflow-hidden ${bgType === 'avatar' ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {targetAvatarUrl ? (
                    <img src={targetAvatarUrl} alt="Avatar" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                </div>
                
                <span className={`relative z-10 text-[10px] font-black uppercase tracking-widest text-center leading-tight ${bgType === 'avatar' ? 'text-emerald-800' : 'text-slate-500'}`}>
                  Use<br/>Avatar
                </span>

                {/* Faint background overlay of their avatar for extra UI polish */}
                {targetAvatarUrl && (
                  <div className="absolute inset-0 z-0 pointer-events-none">
                    <img src={targetAvatarUrl} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${bgType === 'avatar' ? 'opacity-20' : 'opacity-[0.03] grayscale'}`} crossOrigin="anonymous" />
                  </div>
                )}
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
                
                {activeFilter === 'favorites' && isGuest && (
                  <div className="w-[200px] flex flex-col items-center justify-center text-center px-4 shrink-0 border-2 border-dashed border-slate-200 rounded-[20px] h-[130px]">
                    <Heart className="w-6 h-6 text-slate-300 mb-2" />
                    <p className="text-[10px] font-bold text-slate-400 mb-2 leading-tight">Create an account to save templates.</p>
                    <button onClick={() => setShowAuthModal(true)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-wide transition">Sign Up</button>
                  </div>
                )}

                {activeFilter === 'favorites' && !isGuest && filteredFavorites.length === 0 && (
                  <div className="w-[200px] text-sm font-bold text-slate-400 text-center flex items-center justify-center shrink-0">No favorites pinned yet.</div>
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
                        <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-20 will-change-transform">
                          <div className="bg-black/80 md:bg-black/60 md:backdrop-blur-md p-1.5 rounded-full mb-1 border border-white/10 will-change-transform">
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
        className={`fixed inset-0 bg-black/60 md:bg-black/40 md:backdrop-blur-sm z-40 transition-opacity duration-300 ${activePack ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setActivePack(null)}
        style={{ willChange: 'opacity' }}
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
              <p className="text-slate-500 font-medium mb-8">
                {isGuest ? 'Create a free account to unlock premium templates and features.' : 'Upgrade to Pro to use this template and 100+ more.'}
              </p>
              
              <button 
                onClick={() => {
                  if (isGuest) {
                    setActivePack(null)
                    setShowAuthModal(true)
                  } else {
                    router.push('/settings')
                  }
                }} 
                className="w-full max-w-[250px] bg-[#ffcc00] text-yellow-950 font-black py-4 px-6 rounded-full shadow-sm hover:scale-105 transition-transform uppercase tracking-wide mb-5"
              >
                {isGuest ? 'Sign up to Unlock' : 'Upgrade to Pro'}
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

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition">
              <X className="w-4 h-4" />
            </button>
            
            <h2 className="text-2xl font-black text-slate-800 mb-2">Save your progress</h2>
            <p className="text-slate-500 text-sm mb-6">Create a free account to unlock features and save your quote.</p>
            
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
                className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 active:scale-95 transition disabled:opacity-50 flex items-center justify-center"
              >
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Log In' : 'Create Account')}
              </button>
            </form>
            
            <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center mt-5 text-sm font-bold text-slate-400 hover:text-black transition-colors">
              {isLogin ? "Need an account? Create Account" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      )}

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