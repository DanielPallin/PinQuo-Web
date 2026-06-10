'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Bell, Edit3, Camera, Star, 
  Crown, LayoutTemplate, User, Loader2, Check, X, ChevronRight
} from 'lucide-react'

type Profile = {
  id: string
  username: string
  bio: string | null
  avatar_url: string | null
}

type MiniQuote = {
  id: string
  template: { style_config: { gradient: string, baseColor: string } } | null
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  
  const [published, setPublished] = useState<MiniQuote[]>([])
  const [publishedCount, setPublishedCount] = useState(0)
  
  const [quotedIn, setQuotedIn] = useState<MiniQuote[]>([])
  const [quotedInCount, setQuotedInCount] = useState(0)

  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')

  const [isEditingBio, setIsEditingBio] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData && isMounted) {
        setProfile(profileData)
        setEditUsername(profileData.username)
        setEditBio(profileData.bio || '')
      }

      const { count: followerCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id)
      const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)
      
      if (isMounted) {
        setFollowers(followerCount || 0)
        setFollowing(followingCount || 0)
      }

      const { data: pubData, count: pubCount } = await supabase
        .from('quotes')
        .select('id, template:templates(style_config)', { count: 'exact' })
        .eq('publisher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4)
      
      if (isMounted) {
        setPublished((pubData as unknown as MiniQuote[]) || [])
        setPublishedCount(pubCount || 0)
      }

      const { data: quotedData, count: quotedCount } = await supabase
        .from('quotes')
        .select('id, template:templates(style_config)', { count: 'exact' })
        .eq('quoted_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4)
      
      if (isMounted) {
        setQuotedIn((quotedData as unknown as MiniQuote[]) || [])
        setQuotedInCount(quotedCount || 0)
        setIsLoading(false)
      }
    }

    void fetchProfileData()

    return () => { isMounted = false }
  }, [supabase, router])

  const handleUsernameSave = async () => {
    if (!profile) return
    setUsernameError('')
    const cleanUsername = editUsername.trim()

    if (cleanUsername.length < 3) {
      setUsernameError('At least 3 characters')
      return
    }
    if (cleanUsername.length > 30) {
      setUsernameError('Max 30 characters')
      return
    }
    if (cleanUsername === profile.username) {
      setIsEditingUsername(false)
      return
    }

    const { data: existing } = await supabase.from('profiles').select('id').eq('username', cleanUsername).neq('id', profile.id).maybeSingle()
    if (existing) {
      setUsernameError('Usarname already taken')
      return
    }

    const { error } = await supabase.from('profiles').update({ username: cleanUsername }).eq('id', profile.id)
    if (!error) {
      setProfile({ ...profile, username: cleanUsername })
      setIsEditingUsername(false)
    } else {
      setUsernameError('Error updating username')
    }
  }

  const handleBioSave = async () => {
    if (!profile) return
    const cleanBio = editBio.trim()
    const { error } = await supabase.from('profiles').update({ bio: cleanBio }).eq('id', profile.id)
    if (!error) {
      setProfile({ ...profile, bio: cleanBio })
      setIsEditingBio(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !profile) return
    
    setIsUploading(true)
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const filePath = `${profile.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

    if (uploadError) {
      console.error(uploadError)
      alert("Error uploading file.")
      setIsUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)

    if (!updateError) {
      setProfile({ ...profile, avatar_url: publicUrl })
    }
    setIsUploading(false)
  }

  const renderMiniGrid = (quotes: MiniQuote[], onClick: () => void) => {
    const slots = [...quotes, ...Array(Math.max(0, 4 - quotes.length)).fill(null)].slice(0, 4)
    return (
      <button onClick={onClick} className="w-full aspect-square bg-slate-100 rounded-[32px] p-3.5 grid grid-cols-2 grid-rows-2 gap-3 hover:scale-105 active:scale-95 transition-all shadow-inner border-[3px] border-slate-50 cursor-pointer">
        {slots.map((q, i) => {
          const bgGradient = q?.template?.style_config?.gradient || 'from-slate-200 to-slate-300'
          return <div key={i} className={`w-full h-full rounded-2xl ${q ? `bg-linear-to-br ${bgGradient} shadow-sm` : 'bg-slate-200/50'}`} />
        })}
      </button>
    )
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-white pb-24 pt-6 px-6">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <button title="Back" onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft className="w-8 h-8 text-black" /></button>
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-black text-black leading-none">PinQuo</h1>
          <p className="text-slate-500 font-bold text-sm mt-1">Profile</p>
        </div>
        <button title="Notiser" className="relative p-2 -mr-2 hover:bg-slate-100 rounded-full transition">
          <Bell className="w-7 h-7 text-black" />
        </button>
      </div>

      {/* Profilinfo */}
      <div className="flex gap-6 mb-10 w-full items-start">
        <div className="flex flex-col items-center gap-3 w-1/3 shrink-0 pt-1">
          <div className="flex flex-col items-center w-full">
            {isEditingUsername ? (
              <div className="flex flex-col items-center gap-1 w-full bg-slate-100 rounded-lg p-1.5 border border-slate-300">
                <input 
                  type="text" 
                  title="Ändra användarnamn"
                  maxLength={30}
                  value={editUsername} 
                  onChange={(e) => setEditUsername(e.target.value)} 
                  className="w-full bg-transparent text-sm font-bold text-slate-800 text-center outline-none px-1"
                  autoFocus
                />
                <div className="flex justify-center gap-2 mt-1 w-full">
                  <button title="Save" onClick={handleUsernameSave} className="flex-1 py-1 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 flex justify-center"><Check className="w-4 h-4" /></button>
                  <button title="Cancel" onClick={() => { setIsEditingUsername(false); setEditUsername(profile?.username || '') }} className="flex-1 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex justify-center"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-center gap-1 w-full px-1">
                <span className="font-bold text-lg text-slate-800 wrap-break-words text-center leading-tight">
                  {profile?.username}
                </span>
                <button title="Change Username" onClick={() => setIsEditingUsername(true)} className="text-slate-400 hover:text-black transition shrink-0 mt-1">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            {usernameError && <span className="text-xs text-red-500 font-bold mt-1 text-center leading-tight">{usernameError}</span>}
          </div>

          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-slate-100 shadow-md flex items-center justify-center overflow-hidden">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              ) : profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-slate-400" />
              )}
            </div>
            <input type="file" title="Upload Avatar" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} title="Upload Avatar" disabled={isUploading} className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-slate-100 hover:bg-slate-50 transition disabled:opacity-50">
              <Camera className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="font-black text-lg text-slate-800">Bio</span>
            {!isEditingBio && (
              <button title="Change Bio" onClick={() => setIsEditingBio(true)} className="text-slate-400 hover:text-black transition"><Edit3 className="w-4 h-4" /></button>
            )}
          </div>
          <div className={`bg-slate-100 rounded-[28px] rounded-tl-sm p-5 flex-1 shadow-sm transition-all ${isEditingBio ? 'ring-2 ring-emerald-300' : ''}`}>
            {isEditingBio ? (
              <div className="flex flex-col h-full gap-2">
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="w-full h-24 bg-transparent text-slate-700 font-medium leading-snug outline-none resize-none" placeholder="Berätta något om dig själv..." autoFocus />
                <div className="flex justify-end gap-2 mt-auto">
                  <button onClick={() => { setIsEditingBio(false); setEditBio(profile?.bio || '') }} className="text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                  <button onClick={handleBioSave} className="text-sm font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full hover:bg-emerald-200">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 font-medium leading-snug wrap-break-words">
                {profile?.bio || "Type something here!"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grid Click Zones */}
      <div className="flex gap-6 mb-10">
        <div className="flex-1 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-0.5">
            <h3 className="font-black text-lg text-slate-800">Published</h3>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{publishedCount} Total</span>
          </div>
          {renderMiniGrid(published, () => router.push(`/${profile?.username}/published`))}
        </div>
        
        <div className="flex-1 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-0.5">
            <h3 className="font-black text-lg text-slate-800">Quoted In</h3>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{quotedInCount} Total</span>
          </div>
          {renderMiniGrid(quotedIn, () => router.push(`/${profile?.username}/quoted-in`))}
        </div>
      </div>

      {/* Stats & Menyer */}
      <div className="flex gap-6">
        <div className="w-1/3 flex flex-col gap-4 items-center shrink-0">
          <div className="flex flex-col items-center w-full">
            <div className="bg-slate-100 py-2 px-6 rounded-full text-slate-500 font-bold text-sm w-full text-center">Following</div>
            <span className="font-black text-xl text-black mt-1">{following}</span>
          </div>
          <div className="flex flex-col items-center w-full">
            <div className="bg-slate-100 py-2 px-6 rounded-full text-slate-500 font-bold text-sm w-full text-center">Followers</div>
            <span className="font-black text-xl text-black mt-1">{followers}</span>
          </div>
          
          {/* favourites */}
          <div className="flex flex-col items-center w-full mt-2">
            <div className="bg-slate-100 py-2 px-6 rounded-full text-slate-500 font-bold text-sm w-full text-center mb-3">Favourites</div>
            <Link 
              href="/profile/favourites" 
              title="My Favourites" 
              className="hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            >
              <Star className="w-10 h-10 fill-yellow-400 text-yellow-500 drop-shadow-sm" />
            </Link>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <button className="flex items-center justify-between bg-white p-4 rounded-3xl hover:bg-slate-50 active:bg-slate-100 transition group border border-slate-100 shadow-sm cursor-pointer">
            <div className="flex items-center gap-4">
              <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500/20" />
              <span className="font-bold text-slate-700 text-lg">PinQuo Pro</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-black transition" />
          </button>
          <button className="flex items-center justify-between bg-white p-4 rounded-3xl hover:bg-slate-50 active:bg-slate-100 transition group border border-slate-100 shadow-sm cursor-pointer">
            <div className="flex items-center gap-4">
              <LayoutTemplate className="w-6 h-6 text-slate-400" />
              <span className="font-bold text-slate-700 text-lg">Templates</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-black transition" />
          </button>
          <button className="flex items-center justify-between bg-white p-4 rounded-3xl hover:bg-slate-50 active:bg-slate-100 transition group border border-slate-100 shadow-sm cursor-pointer">
            <div className="flex items-center gap-4">
              <User className="w-6 h-6 text-slate-400" />
              <span className="font-bold text-slate-700 text-lg">Settings</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-black transition" />
          </button>
        </div>
      </div>
    </div>
  )
}