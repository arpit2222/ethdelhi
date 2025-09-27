import React from 'react';

export default function Footer(): JSX.Element {
    return(
        <footer className="bg-gray-900 border-t border-gray-700/50">
        <div className="container mx-auto px-6 py-8 text-center text-gray-400">
          <p className="text-lg font-semibold text-white mb-2"><span className="text-indigo-400">Defi</span>QuantHQ</p>
          <p className="text-sm">&copy; 2025 DefiQuantHQ. Democratizing the future of finance. All rights reserved.</p>
          <div className="flex justify-center space-x-6 mt-4">
            <a href="#" className="hover:text-indigo-400 transition">Twitter</a>
            <a href="#" className="hover:text-indigo-400 transition">Discord</a>
            <a href="#" className="hover:text-indigo-400 transition">GitHub</a>
          </div>
        </div>
    </footer>
    )
}
