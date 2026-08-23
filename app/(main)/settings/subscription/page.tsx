'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Crown, Check, Sparkles } from 'lucide-react'

export default function SubscriptionPage() {
  const router = useRouter()

  // 👇 Your updated list of premium features 👇
  const features = [
    "Access All Templates",
    "Enhance & Customize Templates",
    "Watermark Free HD Exports",
    "Exclusive Fonts",
    "Memories",
    "Increased Visibility",
    "Early Access to New Features"
  ]

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center border-b border-slate-100 will-change-transform">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-black text-lg text-slate-800 ml-2">Subscription</h1>
      </header>

      <div className="p-4 sm:p-6 mt-4 flex flex-col items-center text-center">
        
        {/* The Golden Teaser Card */}
        <div className="w-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 rounded-[40px] p-8 shadow-xl shadow-yellow-500/20 relative overflow-hidden">
          {/* Shine effect */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-white/30 shadow-inner">
              <Crown className="w-8 h-8 text-white fill-white" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-2">
              PinQuote PRO
            </h2>
            <p className="text-yellow-50 font-medium text-[15px] max-w-xs leading-snug">
              The ultimate toolkit for creators. Stand out and elevate your quotes.
            </p>
            
            <div className="mt-6 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 text-white font-bold text-sm shadow-sm">
              Launching Soon
            </div>
          </div>
        </div>

        {/* Feature List */}
        <div className="w-full mt-8 bg-white rounded-[32px] border border-slate-100 p-6 sm:p-8 text-left shadow-sm">
          <h3 className="font-black text-slate-800 text-lg mb-6">What's included?</h3>
          <ul className="space-y-4">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="font-bold text-slate-700 text-[15px] leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}