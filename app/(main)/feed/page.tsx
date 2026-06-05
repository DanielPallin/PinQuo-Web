import { createClient } from '@/lib/supabase/server'
import { Star, Bell } from 'lucide-react'
import TemplateCard from '@/components/TemplateCard'
import Link from 'next/link'
import type { QuoteWithRelations, TemplateStyleRow } from '@/types/quote'
import type { PostgrestError } from '@supabase/supabase-js'

export const revalidate = 0 

export default async function FeedPage() {
  const supabase = await createClient()

  // Strictly type both the returned data array and the Supabase PostgrestError object[cite: 3]
  const { data: quotes, error } = (await supabase
    .from('quotes')
    .select(`
      id,
      content,
      quoted_email,
      live_photo_url,
      created_at,
      publisher:profiles!publisher_id (id, username, avatar_url, is_pro),
      quoted_user:profiles!quoted_user_id (id, username, avatar_url, is_pro),
      templates (id, name, style_config)
    `)
    .order('created_at', { ascending: false })) as { 
      data: QuoteWithRelations[] | null
      error: PostgrestError | null 
    }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl mt-6 font-medium text-sm">
        Failed to fetch feed updates: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      
      {/* App Header Bar mimicking Wireframe Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 sticky top-0 bg-slate-50/90 backdrop-blur-md pt-4 z-40 px-2">
        <div>
          <span className="text-2xl font-black tracking-tight text-black">PinQuo</span>
        </div>
        
        {/* Notification Bell with Badge Counter[cite: 2] */}
        <Link href="/notifications" className="relative p-1.5 text-slate-800 hover:text-black transition">
          <Bell className="w-6 h-6 stroke-[2.2]" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center">
            2
          </span>
        </Link>
      </div>

      {/* Main Stream Sequence[cite: 1, 2] */}
      <div className="space-y-6 pb-24">
        {quotes?.map((quote: QuoteWithRelations) => {
          const styleConfig = quote.templates?.style_config as TemplateStyleRow | null

          return (
            <article key={quote.id} className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
              
              {/* Attribution Line: "Published by username"[cite: 2] */}
              <div className="p-3 px-4 flex items-center justify-between bg-white border-b border-slate-50">
                <div className="flex items-center gap-2.5">
                  <Link href={`/user/${quote.publisher?.username || ''}`} className="relative group">
                    <img 
                      src={quote.publisher?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                      alt="" 
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    {quote.publisher?.is_pro && (
                      <span className="absolute -top-1 -right-1 text-[8px]" title="PRO Member">👑</span>
                    )}
                  </Link>
                  <p className="text-xs text-slate-500 font-medium">
                    Published by{' '}
                    <Link href={`/user/${quote.publisher?.username || ''}`} className="font-bold text-slate-900 hover:underline">
                      {quote.publisher?.username || 'user'}
                    </Link>
                  </p>
                </div>
              </div>

              {/* Central Box Card Visual Workspace[cite: 1, 2] */}
              <TemplateCard 
                content={quote.content}
                quotedUser={quote.quoted_user}
                quotedEmail={quote.quoted_email}
                templateConfig={styleConfig}
                useAvatarBg={!quote.templates} 
                livePhotoUrl={quote.live_photo_url}
              />

              {/* Interaction Row Layout: Reactions & Favourite[cite: 2] */}
              <div className="px-4 py-3 bg-white flex items-center justify-between border-t border-slate-50">
                
                {/* 3-slot Quick Reaction Dock Layout[cite: 2] */}
                <div className="flex items-center gap-2">
                  <button className="text-xl p-1.5 hover:scale-125 transition active:scale-95 bg-slate-50 rounded-full w-9 h-9 flex items-center justify-center" title="🔥 React">
                    🔥
                  </button>
                  <button className="text-xl p-1.5 hover:scale-125 transition active:scale-95 bg-slate-50 rounded-full w-9 h-9 flex items-center justify-center" title="❤️ React">
                    ❤️
                  </button>
                  <button className="text-xl p-1.5 hover:scale-125 transition active:scale-95 bg-slate-50 rounded-full w-9 h-9 flex items-center justify-center" title="💯 React">
                    💯
                  </button>
                </div>

                {/* Save to Favourites Star Button[cite: 2] */}
                <button 
                  className="p-2 text-slate-400 hover:text-amber-500 transition-colors rounded-full hover:bg-amber-50/50 group" 
                  title="Save to Favourites"
                >
                  <Star className="w-5 h-5 group-hover:scale-110 transition-transform stroke-[2.2]" />
                </button>
              </div>

            </article>
          )
        })}

        {quotes?.length === 0 && (
          <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl p-6">
            <p className="text-slate-400 text-sm font-medium mb-3">No one has quoted anyone yet!</p>
            <Link href="/create" className="text-xs bg-black text-white px-4 py-2 rounded-xl font-bold inline-block hover:opacity-90">
              Create a Quote
            </Link>
          </div>
        )}
      </div>

    </div>
  )
}