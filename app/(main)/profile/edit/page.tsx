'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Loader2 } from 'lucide-react'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/')
      
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('username, bio, avatar_url').eq('id', user.id).single()
      
      if (data) {
        setUsername(data.username || '')
        setBio(data.bio || '')
        setAvatarUrl(data.avatar_url)
      }
      setIsLoading(false)
    }
    fetchProfile()
  }, [supabase, router])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !userId) return
    setIsUploading(true)
    
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
    if (uploadError) {
      setError("Failed to upload image.")
      setIsUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    setAvatarUrl(publicUrl)
    setIsUploading(false)
  }

  const handleSave = async () => {
    if (!userId) return
    setError('')
    setIsSaving(true)

    const cleanUsername = username.trim()
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.')
      setIsSaving(false)
      return
    }

    // Check if username is taken by someone else
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .neq('id', userId)
      .maybeSingle()
      
    if (existing) {
      setError('Username is already taken.')
      setIsSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: cleanUsername, bio: bio.trim(), avatar_url: avatarUrl })
      .eq('id', userId)

    if (updateError) {
      setError('Failed to update profile.')
    } else {
      router.push('/profile')
      router.refresh()
    }
    setIsSaving(false)
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-white">
      
      {/* App Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 will-change-transform">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-black text-lg text-slate-800">Edit Profile</h1>
        <button 
          onClick={handleSave} 
          disabled={isSaving || isUploading}
          className="font-bold text-emerald-600 px-4 py-1.5 rounded-full hover:bg-emerald-50 disabled:opacity-50 transition"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </header>

      <div className="p-6 flex flex-col items-center">
        
        {/* Avatar Editor */}
        <div className="relative mb-8 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-28 h-28 rounded-full bg-slate-100 border-[4px] border-white shadow-md flex items-center justify-center overflow-hidden transition group-hover:opacity-80">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-10 h-10 text-slate-300" />
            )}
          </div>
          <div className="absolute bottom-0 right-0 bg-black text-white p-2.5 rounded-full shadow-lg border-2 border-white">
            <Camera className="w-4 h-4" />
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
        </div>

        {error && <div className="mb-4 text-sm font-bold text-red-500 bg-red-50 px-4 py-2 rounded-xl w-full text-center">{error}</div>}

        {/* Username Input */}
        <div className="w-full mb-6">
          <label className="block text-sm font-bold text-slate-500 mb-2 pl-1">Username</label>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400 font-bold">@</span>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} // Restricts to valid username chars instantly
              maxLength={30}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all"
            />
          </div>
        </div>

        {/* Bio Input */}
        <div className="w-full mb-6">
          <label className="block text-sm font-bold text-slate-500 mb-2 pl-1">Bio</label>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={150}
            rows={4}
            placeholder="Tell us about yourself..."
            className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-4 font-medium text-slate-700 outline-none resize-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all leading-snug"
          />
          <div className="text-right text-xs font-bold text-slate-400 mt-2 pr-2">
            {bio.length}/150
          </div>
        </div>

      </div>
    </div>
  )
}