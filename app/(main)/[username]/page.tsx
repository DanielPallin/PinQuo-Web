'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Crown, User, Loader2 } from 'lucide-react'

// Strict Types
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

export default function PublicProfilePage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  // Safely extract the username from the URL
  const usernameParam = typeof params?.username === 'string' ? decodeURIComponent(params.username) : ''

  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null)
  
  // Follow States
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)
  
  // Quote Grids
  const [published, setPublished] = useState<MiniQuote[]>([])
  const [quotedIn, setQuotedIn] = useState<MiniQuote[]>([])

  useEffect(() => {
    let isMounted = true

    const fetchPublicProfile = async () => {
      if (!usernameParam) return

      // Get current logged-in user (who is doing the following?)
      const { data: { user } } = await supabase.auth.getUser()
      if (user && isMounted) setCurrentUser({ id: user.id })

      // Fetch the Target Profile by their Username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', usernameParam) // case-insensitive match
        .single()

      if (profileError || !profileData) {
        if (isMounted) {
          setIsNotFound(true)
          setIsLoading(false)
        }
        return
      }

      if (isMounted) setTargetProfile(profileData)

      // Fetch Follow Stats for this profile
      const { count: followerCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id)
      const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id)
      
      if (isMounted) {
        setFollowers(followerCount || 0)
        setFollowing(followingCount || 0)
      }

      // Check if Current User is already following them
      if (user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('created_at')
          .match({ follower_id: user.id, following_id: profileData.id })
          .maybeSingle()
        
        if (isMounted && followData) setIsFollowing(true)
      }

      // Fetch Published Quotes
      const { data: pubData } = await supabase
        .from('quotes')
        .select('id, template:templates(style_config)')
        .eq('publisher_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (isMounted) setPublished((pubData as unknown as MiniQuote[]) || [])

      // Fetch Quoted In
      const { data: quotedData } = await supabase
        .from('quotes')
        .select('id, template:templates(style_config)')
        .eq('quoted_user_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (isMounted) {
        setQuotedIn((quotedData as unknown as MiniQuote[]) || [])
        setIsLoading(false)
      }
    }

    void fetchPublicProfile()

    return () => { isMounted = false }
  }, [supabase, usernameParam])

  // Optimistic Follow Action
  const handleToggleFollow = async () => {
    if (!currentUser || !targetProfile || isTogglingFollow) return
    
    // Prevent following yourself. REMINDER: MAKE BUTTON INVISIBLE
    if (currentUser.id === targetProfile.id) {
      router.push('/profile')
      return
    }

    setIsTogglingFollow(true)
    const currentlyFollowing = isFollowing

    // Instantly updates screen
    setIsFollowing(!currentlyFollowing)
    setFollowers(prev => prev + (currentlyFollowing ? -1 : 1))

    // Database Sync
    if (!currentlyFollowing) {
      // Execute Follow
      const { error: followError } = await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetProfile.id })
      
      if (!followError) {
        // NEW: Trigger notification for the followed user
        await supabase.from('notifications').insert({
          receiver_id: targetProfile.id,
          actor_id: currentUser.id,
          type: 'follow'
        })
      }
    } else {
      // Execute Unfollow
      await supabase.from('follows').delete().match({ follower_id: currentUser.id, following_id: targetProfile.id })
    }

    setIsTogglingFollow(false)
  }

  // Helper to render the 3-slot horizontal preview
  const renderHorizontalGrid = (quotes: MiniQuote[], title: string, navigateTo: string) => {
    // Force exactly 3 slots
    const slots = [...quotes, ...Array(Math.max(0, 3 - quotes.length)).fill(null)].slice(0, 3)

    return (
      <div className="flex flex-col w-full mb-8">
        <div className="flex items-center justify-between px-2 mb-3">
          <h3 className="font-black text-[15px] text-slate-800 tracking-tight">{title}</h3>
        </div>
        
        {/* grid layout */}
        <div 
          onClick={() => router.push(navigateTo)}
          className="grid grid-cols-3 gap-3 w-full bg-slate-50/50 p-3 rounded-[28px] border-[3px] border-slate-50 shadow-inner cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          {slots.map((q, i) => {
            const bgGradient = q?.template?.style_config?.gradient || 'from-slate-200 to-slate-300'
            return (
              <div 
                key={i} 
                className={`w-full aspect-square rounded-[18px] shadow-sm ${q ? `bg-linear-to-br ${bgGradient}` : 'bg-slate-200/40'}`}
              />
            )
          })}
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>
  
  if (isNotFound) return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-black text-slate-800 mb-2">User not found</h2>
      <p className="text-slate-500 mb-6">The user @{usernameParam} cannot be found.</p>
      <button onClick={() => router.back()} className="px-6 py-3 bg-black text-white font-bold rounded-full">Go Back</button>
    </div>
  )

  const isOwnProfile = currentUser?.id === targetProfile?.id

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-white pb-24 relative overflow-x-hidden">
      
      {/* Background Graphic Pattern */}
      <div className="absolute top-0 left-0 w-full h-64 bg-linear-to-b from-slate-100 to-white -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center pt-6 px-6 mb-2 shrink-0">
        <button title="Back" onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-200/50 rounded-full transition"><ArrowLeft className="w-8 h-8 text-black" /></button>
        {/* Placeholder for top right action if needed */}
        <div className="w-10" /> 
      </div>

      {/* Profile Centerpiece */}
      <div className="flex flex-col items-center px-6 mt-2 mb-8">
        {/* Crown & Avatar */}
        <div className="relative mb-3 flex flex-col items-center">
          <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500/20 mb-1 drop-shadow-sm" />
          <div className="w-28 h-28 rounded-full bg-slate-200 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
            {targetProfile?.avatar_url ? (
              <img src={targetProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-slate-400" />
            )}
          </div>
        </div>

        {/* Username */}
        <h1 className="text-2xl font-black text-slate-900 mb-5">{targetProfile?.username}</h1>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-12 w-full mb-6">
          <div className="flex flex-col items-center">
            <span className="font-black text-xl text-black">{followers}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Followers</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-black text-xl text-black">{following}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Following</span>
          </div>
        </div>

        {/* Follow Button */}
        <button 
          onClick={handleToggleFollow}
          disabled={isOwnProfile || isTogglingFollow}
          className={`w-full max-w-[280px] py-4 rounded-full font-black text-[15px] transition-all duration-200 shadow-md ${
            isOwnProfile 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              : isFollowing 
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent' 
                : 'bg-black text-white hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isOwnProfile ? 'This is you' : isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Content Grids */}
      <div className="px-6 flex flex-col w-full">
        {renderHorizontalGrid(published, `Published by ${targetProfile?.username}`, `/${targetProfile?.username}/published`)}
        {renderHorizontalGrid(quotedIn, `${targetProfile?.username} was quoted in`, `/${targetProfile?.username}/quoted-in`)}
      </div>

    </div>
  )
}