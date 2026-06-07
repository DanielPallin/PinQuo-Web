'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Star, Loader2, User } from 'lucide-react'

// Reuse our perfect text scaling logic!
const getQuoteFontSize = (text: string) => {
  const len = text.length
  if (len < 40) return 'text-4xl md:text-5xl'
  if (len < 80) return 'text-3xl md:text-4xl'
  if (len < 140) return 'text-2xl md:text-3xl'
  if (len < 200) return 'text-xl md:text-2xl'
  return 'text-lg md:text-xl'
}

// Define the shape of our joined database data
type FeedQuote = {
  id: string
  content: string
  created_at: string
  quoted_email: string | null
  publisher: { username: string } | null
  quoted_user: { username: string } | null
  template: { style_config: { gradient: string, baseColor: string } } | null
}

export default function FeedPage() {
  const supabase = createClient()
  const [quotes, setQuotes] = useState<FeedQuote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFeed = async () => {
      // Fetch quotes and join the profiles and templates tables to get all the rich data
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          id,
          content,
          created_at,
          quoted_email,
          publisher:profiles!quotes_publisher_id_fkey(username),
          quoted_user:profiles!quotes_quoted_user_id_fkey(username),
          template:templates(style_config)
        `)
        .order('created_at', { ascending: false })

        if (data) {
          // Cast to unknown first to override Supabase's array assumption
          setQuotes(data as unknown as FeedQuote[])
        } else if (error) {
        console.error("Error fetching feed:", error)
      }
      setIsLoading(false)
    }

    fetchFeed()
  }, [supabase])

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-slate-50/50 pb-24 pt-6 px-4">
      
      {/* Feed Header */}
      <div className="flex justify-between items-center mb-8 px-2 shrink-0">
        <h1 className="text-4xl font-black text-black">PinQuo</h1>
        <button className="relative p-2 rounded-full hover:bg-slate-200 transition">
          <Bell className="w-8 h-8 text-black" />
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center mt-20">
          <Loader2 className="w-12 h-12 animate-spin text-slate-300" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center mt-20">
          <p className="text-slate-500 font-bold text-xl">No quotes found. Be the first!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {quotes.map((quote) => {
            // Safely extract the data
            const publisherName = quote.publisher?.username || 'Unknown'
            const targetName = quote.quoted_user?.username || quote.quoted_email || 'Unknown'
            const displayHandle = `@${targetName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
            const bgGradient = quote.template?.style_config?.gradient || 'from-indigo-500 to-purple-600'

            return (
              <div key={quote.id} className="w-full flex flex-col bg-white rounded-[40px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                
                {/* Publisher Header */}
                <div className="flex items-center gap-3 mb-5 px-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium text-sm">
                    Published by <span className="font-bold text-slate-800">{publisherName}</span>
                  </p>
                </div>

                {/* THE MEME QUOTE CARD (Exact copy of the Preview Page) */}
                <div className="w-full bg-white rounded-[32px] shadow-lg overflow-hidden flex flex-col border border-slate-100">
                  <div className="relative w-full h-56 shrink-0">
                    <div className={`absolute inset-0 bg-linear-to-br ${bgGradient}`}></div>
                    
                    {/* Fallback avatar tint if no template gradient exists */}
                    {!quote.template && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 mix-blend-overlay"></div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-linear-to-t from-white via-white/80 to-transparent"></div>
                  </div>

                  <div className="relative bg-white px-6 pb-8 pt-2 flex flex-col items-center text-center -mt-10 z-10">
                    <div className="text-[70px] font-serif font-black text-black leading-none tracking-tighter mb-1 select-none">
                      “ ”
                    </div>
                    
                    <p className={`font-medium text-black leading-snug wrap-break-words whitespace-pre-wrap px-2 ${getQuoteFontSize(quote.content)}`}>
                      {quote.content}
                    </p>

                    <div className="w-full mt-8 flex flex-col items-center relative">
                      <div className="w-12 h-[2px] bg-black mb-3"></div>
                      <p className="text-xl font-medium text-black tracking-wide">
                        {targetName}
                      </p>
                      <p className="text-slate-400 font-medium text-base mt-0.5">
                        {displayHandle}
                      </p>
                      
                      <span className="absolute bottom-0 right-0 text-slate-300 font-medium text-[11px] translate-y-6">
                        PinQuo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Social Actions Footer */}
                <div className="flex justify-between items-center mt-5 px-3">
                  <div className="flex items-center gap-4 text-2xl select-none">
                    <button className="hover:scale-110 transition-transform active:scale-95">🔥</button>
                    <button className="hover:scale-110 transition-transform active:scale-95">💖</button>
                    <button className="hover:scale-110 transition-transform active:scale-95">💯</button>
                  </div>
                  <button className="text-slate-400 hover:text-yellow-400 hover:scale-110 transition-all active:scale-95">
                    <Star className="w-8 h-8" strokeWidth={2} />
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}