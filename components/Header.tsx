'use client'; 

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle'; // 💥 Import the new toggle

export default function Header() {
  const pathname = usePathname();

  // Hide the header completely on the login/auth page
  if (pathname === '/') return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-black md:bg-black/50 md:backdrop-blur-md will-change-transform">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* LOGO SECTION */}
        <div className="flex flex-1 items-center justify-start">
          <Link href="/feed" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <Image
              src="/PinQuote-Logo.png" 
              alt="PinQuo Logo"
              width={120}
              height={40}
              priority
              className="h-8 w-auto object-contain" 
            />
          </Link>
        </div>

        {/* THEME TOGGLE SECTION */}
        <div className="flex shrink-0 items-center">
          <ThemeToggle /> {/* 💥 Dropped in right here! */}
        </div>

      </div>
    </header>
  );
}