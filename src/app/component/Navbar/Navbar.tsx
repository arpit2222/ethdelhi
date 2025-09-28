import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Navbar(): JSX.Element {
    return(
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white hover:text-indigo-400 transition">
            <span className="text-indigo-400">Defi</span>QuantHQ
          </Link>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <Link href="/marketplace" className="text-gray-300 hover:text-indigo-400 transition">Marketplace</Link>
            <Link href="/lop" className="text-gray-300 hover:text-indigo-400 transition">LimitOP</Link>
          </nav>
          <ConnectButton />
        </div>
      </header>
    )
}
