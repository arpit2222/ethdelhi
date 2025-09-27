import React from 'react';

interface Algorithm {
  name: string;
  creator: string;
  return: number;
  risk: 'Low' | 'Medium' | 'High';
  subscribers: number;
  tvl: number;
}

interface FeaturedAlgorithmsSectionProps {
  algorithms: Algorithm[];
}

export default function FeaturedAlgorithmsSection({ algorithms }: FeaturedAlgorithmsSectionProps): JSX.Element {
    return (
        <section id="marketplace" className="py-20 bg-gray-900">
        <div className="container mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white">Top Performing Strategies</h2>
                <p className="text-gray-400 mt-2">Discover algorithms built by top quants, backtested for performance.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {algorithms.map((algo, index) => (
                    <div key={index} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-indigo-500/50 transition duration-300 transform hover:-translate-y-2 shadow-lg hover:shadow-indigo-500/20">
                        <div className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{algo.name}</h3>
                                    <p className="text-sm text-gray-400">by {algo.creator}</p>
                                </div>
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                    algo.risk === 'Low' ? 'bg-emerald-500/20 text-emerald-400' :
                                    algo.risk === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-red-500/20 text-red-400'
                                }`}>{algo.risk} Risk</span>
                            </div>
                            <div className="mt-6 text-center text-4xl font-bold text-emerald-400">
                                {algo.return}%
                                <p className="text-sm font-normal text-gray-400">30-Day Return</p>
                            </div>
                            <div className="mt-6 flex justify-between text-center text-sm">
                                <div>
                                    <p className="font-bold text-white">{algo.subscribers.toLocaleString()}</p>
                                    <p className="text-gray-400">Subscribers</p>
                                </div>
                                <div>
                                    <p className="font-bold text-white">${(algo.tvl / 1000000).toFixed(2)}M</p>
                                    <p className="text-gray-400">TVL</p>
                                </div>
                            </div>
                            <button className="w-full mt-6 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-lg transition duration-300">
                                Subscribe Now
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
    )
}
