import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'], 
  variable: '--font-jakarta',
  display: 'swap',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata = {
  title: 'PinQuo',
  description: 'The social network for memorable quotes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // 3. Inject the CSS variables into the HTML tag
    <html lang="en" className={`${jakarta.variable} ${playfair.variable}`}>
      {/* 
        antialiased makes the font incredibly crisp on Mac/iOS. 
        font-sans applies Jakarta as the default font everywhere! 
      */}
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  )
}