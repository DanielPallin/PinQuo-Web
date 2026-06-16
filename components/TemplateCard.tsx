import React from 'react'

export interface ProfileData {
  username: string
  avatar_url: string | null
  is_pro: boolean
}

export interface TemplateStyle {
  bgGradient?: string
  textColor?: string
  fontFamily?: string
}

interface TemplateCardProps {
  content: string
  quotedUser?: ProfileData | null
  quotedEmail?: string | null
  customAuthorName?: string | null // 1. ADD THIS PROP
  templateConfig?: TemplateStyle | null
  useAvatarBg?: boolean
  livePhotoUrl?: string | null
}

export default function TemplateCard({
  content,
  quotedUser,
  quotedEmail,
  customAuthorName, // 2. EXTRACT IT HERE
  templateConfig,
  useAvatarBg = true,
  livePhotoUrl
}: TemplateCardProps) {
  
  // PRO Feature: Live-Photo Snapshot Background
  if (livePhotoUrl) {
    return (
      <div className="aspect-square w-full relative bg-black flex flex-col items-center justify-center p-8 text-center overflow-hidden">
        <img 
          src={livePhotoUrl} 
          alt="Live Snapshot" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative z-10 px-4">
          <p className="text-xl md:text-2xl font-bold text-white drop-shadow-md leading-relaxed mb-4">
            “{content}”
          </p>
          {/* 3. UPDATE FALLBACK CHAIN */}
          <span className="text-xs tracking-widest text-slate-200 font-bold uppercase block">
            — {quotedUser?.username ? "@" + quotedUser.username : (customAuthorName || quotedEmail || "Unknown")}
          </span>
        </div>
      </div>
    )
  }

  // STANDARD Feature: The Profile Pic Avatar Card
  if (useAvatarBg && quotedUser?.avatar_url) {
    return (
      <div className="aspect-square w-full bg-[#958ce4] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="w-64 h-64 md:w-72 md:h-72 rounded-full overflow-hidden bg-cover bg-center border-4 border-white/40 shadow-inner flex flex-col items-center justify-center p-6 relative">
          <img 
            src={quoteUserAvatar(quotedUser.avatar_url)} 
            alt={quotedUser.username} 
            className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-40 scale-105"
          />
          <div className="absolute inset-0 bg-purple-900/40" />
          
          <div className="relative z-10 flex flex-col items-center justify-between h-full py-4 text-white">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md mb-2">
              <img src={quotedUser.avatar_url} alt="" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm md:text-base font-semibold leading-snug max-w-[200px] line-clamp-4 italic">
              “{content}”
            </p>
            {/* User Avatar cards inherently require a registered user, so no fallback needed here */}
            <span className="text-[11px] tracking-wider font-bold uppercase opacity-90 mt-2 block">
              @{quotedUser.username}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Preset / AI Text Templates Layout
  const bgStyle = templateConfig?.bgGradient || 'from-indigo-900 to-slate-900'
  const textStyle = templateConfig?.textColor || 'text-white'
  const fontStyle = templateConfig?.fontFamily || 'font-serif'

  return (
    <div className={`aspect-square w-full bg-linear-to-br ${bgStyle} flex flex-col items-center justify-center p-10 text-center relative`}>
      <div className="max-w-md space-y-4">
        <p className={`text-xl md:text-2xl font-medium leading-relaxed ${textStyle} ${fontStyle}`}>
          “{content}”
        </p>
        {/* 4. UPDATE FALLBACK CHAIN */}
        <span className={`text-xs uppercase tracking-widest font-bold block opacity-80 ${textStyle}`}>
          — {quotedUser?.username ? `@${quotedUser.username}` : (customAuthorName || quotedEmail || 'Unknown')}
        </span>
      </div>
    </div>
  )
}

function quoteUserAvatar(url: string | null) {
  return url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300'
}