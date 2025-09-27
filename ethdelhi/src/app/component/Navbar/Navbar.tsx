import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Navbar(): JSX.Element {
    return(
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-white">
            <span className="text-indigo-400">Defi</span>QuantHQ
          </div>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <a href="#marketplace" className="text-gray-300 hover:text-indigo-400 transition">Marketplace</a>
            <a href="#ide" className="text-gray-300 hover:text-indigo-400 transition">IDE</a>
            <a href="#dashboard" className="text-gray-300 hover:text-indigo-400 transition">Dashboard</a>
            <a href="#bridge" className="text-gray-300 hover:text-indigo-400 transition">Bridge</a>
          </nav>
          <ConnectButton />
        </div>
      </header>
    )
}
