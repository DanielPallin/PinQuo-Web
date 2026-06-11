import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-black/50 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* LOGO SECTION */}
        <div className="flex flex-1 items-center justify-start">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <Image
              src="/logo.png"
              alt="PinQuo Logo"
              width={120} // Adjust based on your asset's dimensions
              height={40} // Adjust based on your asset's dimensions
              priority // Tells Next.js to load this instantly without lazy-loading
              className="h-8 w-auto object-contain" 
            />
          </Link>
        </div>

        {/* NAVIGATION / ACTIONS */}
        <div className="flex items-center gap-4">
          {/* Add your theme toggles, profile avatars, or sign-out buttons here */}
        </div>

      </div>
    </header>
  );
}