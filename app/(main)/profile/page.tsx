'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings, Edit, User, Loader2, QrCode } from 'lucide-react'

type Profile = {
  id: string
  username: string
  bio: string | null
  avatar_url: string | null
}

type MiniQuote = {
  id: string
  template: { 
    style_config: { gradient: string, baseColor: string } 
    image_url: string | null
  } | null
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false) // 👇 Tracks if they are logged out
  const [profile, setProfile] = useState<Profile | null>(null)
  
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  
  const [published, setPublished] = useState<MiniQuote[]>([])
  const [publishedCount, setPublishedCount] = useState(0)
  
  const [quotedIn, setQuotedIn] = useState<MiniQuote[]>([])
  const [quotedInCount, setQuotedInCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    const fetchProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      // 👇 GRACEFUL GUEST HANDLING 👇
      if (!user) {
        if (isMounted) {
          setIsGuest(true)
          setIsLoading(false)
        }
        return
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData && isMounted) setProfile(profileData)

      const { count: followerCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id)
      const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)
      
      if (isMounted) {
        setFollowers(followerCount || 0)
        setFollowing(followingCount || 0)
      }

      const { data: pubData, count: pubCount } = await supabase
        .from('quotes')
        .select('id, template:templates(style_config,image_url)', { count: 'exact' })
        .eq('publisher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4)
      
      if (isMounted) {
        setPublished((pubData as unknown as MiniQuote[]) || [])
        setPublishedCount(pubCount || 0)
      }

      const { data: quotedData, count: quotedCount } = await supabase
        .from('quotes')
        .select('id, template:templates(style_config,image_url)', { count: 'exact' })
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
  }, [supabase])

  const handleShareProfile = async () => {
    if (!profile) return
    const profileUrl = `${window.location.origin}/${profile.username}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.username} on PinQuo`,
          text: `Check out ${profile.username}'s quotes on PinQuo!`,
          url: profileUrl
        })
      } catch (err) { /* User dismissed share sheet */ }
    } else {
      navigator.clipboard.writeText(profileUrl)
      alert('Profile link copied to clipboard!')
    }
  }

  const renderMiniGrid = (quotesToRender: MiniQuote[], onClick: () => void) => {
    const slots = [0, 1, 2, 3]

    return (
      <div 
        onClick={onClick}
        className="grid grid-cols-2 gap-2 w-full p-2.5 bg-white border border-slate-100 rounded-[32px] cursor-pointer hover:shadow-md hover:border-slate-200 transition-all active:scale-95 group shadow-sm will-change-transform"
      >
        {slots.map((index) => {
          const quote = quotesToRender[index]
          if (!quote) return <div key={`empty-${index}`} className="aspect-square bg-slate-50 border border-slate-100/50 rounded-[20px]"></div>

          return (
            <div key={quote.id} className="relative aspect-square rounded-[20px] overflow-hidden bg-slate-200">
              {quote.template?.image_url ? (
                <img src={quote.template.image_url} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className={`absolute inset-0 bg-linear-to-br ${quote.template?.style_config?.gradient || 'from-slate-200 to-slate-300'}`}></div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>

  // non authenticated
  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 bg-white pb-24">
        <div className="w-24 h-24 bg-slate-50 shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-5xl">🏡</span>
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Claim your space</h2>
        <p className="text-slate-500 font-medium max-w-sm mb-10 leading-relaxed">
          Join PinQuote to customize your profile, track your quotes, and build your audience.
        </p>
        <button 
          onClick={() => router.push('/login')}
          className="bg-black hover:bg-slate-800 text-white font-bold text-lg py-4 px-10 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] active:scale-95 transition-all"
        >
          Join PinQuote
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-white pb-24 pt-8 px-6 relative">

      {/* Top Right Settings Gear */}
      <Link 
        href="/settings" 
        className="absolute top-6 right-6 p-2 text-black bg-slate-200 hover:text-white hover:bg-orange-400 rounded-full transition-colors"
        title="Settings"
      >
        <Settings className="w-6 h-6" />
      </Link>

      {/* HERO SECTION */}
      <div className="flex flex-col items-center w-full mt-4 mb-8">
        
        <div className="w-28 h-28 rounded-full bg-slate-100 border-[2px] border-slate-200 flex items-center justify-center overflow-hidden mb-4 shadow-sm">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-slate-300" />
          )}
        </div>

        <h1 className="font-black text-2xl text-slate-900 mb-2">
          @{profile?.username}
        </h1>

        {profile?.bio && (
          <p className="text-slate-500 font-medium text-center text-[15px] leading-snug max-w-xs mb-4">
            {profile.bio}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm text-slate-500 mb-6">
          <span><strong className="text-slate-800">{followers}</strong> Followers</span>
          <span className="text-slate-300">•</span>
          <span><strong className="text-slate-800">{following}</strong> Following</span>
        </div>

        {/* Floating Action Buttons */}
        <div className="flex items-center justify-center gap-3 w-full">
          <button 
            onClick={handleShareProfile}
            className="flex-1 max-w-[160px] flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-slate-700 font-bold rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] active:translate-y-0 active:scale-95 border border-slate-200 transition-all duration-200 ease-out will-change-transform"
          >
            <QrCode className="w-4 h-4 text-slate-500" />
            Share Profile
          </button>
          
          <Link 
            href="/profile/edit"
            className="flex-1 max-w-[160px] flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-slate-700 font-bold rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] active:translate-y-0 active:scale-95 border border-slate-200 transition-all duration-200 ease-out will-change-transform"
          >
            <Edit className="w-4 h-4 text-slate-500" />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* CONTENT GRIDS */}
      <div className="flex gap-6 w-full">
        <div className="flex-1 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-0.5">
            <h3 className="font-black text-[17px] text-slate-800">Published</h3>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{publishedCount} Total</span>
          </div>
          {renderMiniGrid(published, () => router.push(`/${profile?.username}/published`))}
        </div>
        
        <div className="flex-1 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-0.5">
            <h3 className="font-black text-[17px] text-slate-800">Quoted In</h3>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{quotedInCount} Total</span>
          </div>
          {renderMiniGrid(quotedIn, () => router.push(`/${profile?.username}/quoted-in`))}
        </div>
      </div>

    </div>
  )
}