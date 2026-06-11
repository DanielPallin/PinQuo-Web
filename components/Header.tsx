'use client'; // Required to read the current URL path

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  // Hide the header completely on the login/auth page
  if (pathname === '/') return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-black/50 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* LOGO SECTION */}
        <div className="flex flex-1 items-center justify-start">
          <Link href="/feed" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <Image
              src="/PinQuo_logo.png"
              alt="PinQuo Logo"
              width={120}
              height={40}
              priority
              className="h-8 w-auto object-contain" 
            />
          </Link>
        </div>

        {/* NAVIGATION / ACTIONS */}
        <div className="flex items-center gap-4">
          {/* placeholder */}
        </div>

      </div>
    </header>
  );
}