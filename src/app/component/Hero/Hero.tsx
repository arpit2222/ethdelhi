import React from 'react';

interface HeroProps {
  className?: string;
}

interface ArrowRightProps {
  className?: string;
}

export default function Hero({ className }: HeroProps): JSX.Element {
    return(
        <section className={`container min-h-screen mx-auto px-6 py-20 md:py-32 text-center ${className || ''}`}>
          <div className="bg-indigo-500 mt-25 text-white py-1 px-4 inline-block rounded-full text-xs font-semibold mb-4">
            The Future of Decentralized Finance is Here
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
            Democratize Wall Street.<br /> Decentralize Alpha.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            A decentralized algorithm marketplace combined with cross-chain RWA trading. Developers create, the community invests, and everyone profits together.
          </p>
          <div className="flex justify-center space-x-4">
            <button className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg shadow-xl transition duration-300 transform hover:scale-105 flex items-center space-x-2">
              <span>Start Creating</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg shadow-xl transition duration-300 transform hover:scale-105">
              Browse Strategies
            </button>
          </div>
        </section>
    )
}

const ArrowRight = ({ className = "w-6 h-6" }: ArrowRightProps): JSX.Element => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
  </svg>
);
