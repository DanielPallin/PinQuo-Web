import React from 'react'

export interface ProfileData {
  username: string
  avatar_url: string | null
  is_pro?: boolean
}

export interface TemplateStyle {
  // Modern DB Alignment
  gradient?: string
  image_url?: string | null
  // Legacy Support
  bgGradient?: string
  textColor?: string
  fontFamily?: string
}

interface TemplateCardProps {
  content: string
  quotedUser?: ProfileData | null
  quotedEmail?: string | null
  customAuthorName?: string | null
  templateConfig?: TemplateStyle | null
  useAvatarBg?: boolean
  livePhotoUrl?: string | null
  className?: string
}

const getQuoteFontSize = (text: string) => {
  const len = text.length
  if (len < 40) return 'text-3xl md:text-4xl'
  if (len < 80) return 'text-2xl md:text-3xl'
  if (len < 140) return 'text-xl md:text-2xl'
  if (len < 200) return 'text-lg md:text-xl'
  return 'text-base md:text-lg'
}

export default function TemplateCard({
  content,
  quotedUser,
  quotedEmail,
  customAuthorName,
  templateConfig,
  useAvatarBg = true,
  livePhotoUrl,
  className = ''
}: TemplateCardProps) {
  
  const cleanQuoteContent = content.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim()
  const targetAvatarUrl = quotedUser?.avatar_url
  
  // Clean fallback chain for the author name
  let targetName = 'Unknown'
  if (customAuthorName && customAuthorName.trim() !== '') {
    targetName = customAuthorName
  } else if (quotedUser?.username) {
    targetName = quotedUser.username
  } else if (quotedEmail && quotedEmail.trim() !== '') {
    targetName = 'Pending Invite'
  }

  const bgGradient = templateConfig?.gradient || templateConfig?.bgGradient || 'from-slate-800 to-slate-900'

  return (
    <div className={`aspect-square w-full bg-slate-900 overflow-hidden flex flex-col relative select-none ${className}`}>
      
      {/* Brand Watermark */}
      <img 
        src="/PinQuote-Logo.png" 
        alt="PinQuo" 
        className="absolute top-5 left-5 h-5 sm:h-6 w-auto opacity-60 drop-shadow-md z-20 pointer-events-none select-none"
      />

      {/* 💥 THE UNIFIED WATERFALL BACKGROUND LOGIC */}
      {livePhotoUrl ? (
        <img src={livePhotoUrl} alt="Live Snap" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />
      ) : templateConfig?.image_url ? (
        <img src={templateConfig.image_url} alt="Quote Background" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'contrast(1.15) saturate(1.2) sepia(0.15) brightness(0.85)' }} />
      ) : templateConfig ? (
        <div className={`absolute inset-0 bg-linear-to-br ${bgGradient}`}></div>
      ) : useAvatarBg && targetAvatarUrl ? (
        <div className="absolute inset-0 mix-blend-overlay opacity-80">
          <img src={targetAvatarUrl} alt="Bg" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-slate-800"></div>
      )}

      {/* Cinematic Vignettes */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 mix-blend-multiply pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 sm:p-10 text-center pointer-events-none">
        
        <div className="relative inline-block max-w-[75%] mx-auto mt-4">
          <span className="absolute top-0 left-0 -translate-x-[110%] -translate-y-[40%] text-5xl sm:text-7xl font-serif font-black text-white/50 drop-shadow-lg leading-none pointer-events-none select-none">
            &ldquo;
          </span>
          
          <p 
            className={`font-black text-white leading-snug whitespace-pre-wrap relative z-10 ${getQuoteFontSize(cleanQuoteContent)}`} 
            style={{ textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,1)' }}
          >
            {cleanQuoteContent}
          </p>

          <span className="absolute bottom-0 right-0 translate-x-[110%] translate-y-[30%] text-5xl sm:text-7xl font-serif font-black text-white/50 drop-shadow-lg leading-none pointer-events-none select-none">
            &rdquo;
          </span>
        </div>
        
        <div className="mt-8 sm:mt-10 flex flex-col items-center relative z-10">
          <p 
            className={`font-bold tracking-wide text-lg text-white/90 ${(!quotedUser?.username && !customAuthorName) ? 'italic font-medium' : ''}`} 
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)' }}
          >
            &mdash; {targetName}
          </p>
        </div>
        
      </div>
    </div>
  )
}