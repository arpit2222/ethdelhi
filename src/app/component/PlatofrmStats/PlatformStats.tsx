'use client';
import React, { useEffect, useState } from "react";

interface Stats {
    algorithms: number;
    earnings: number;
    traders: number;
    volume: number;
}

interface IconProps {
    className?: string;
}

const finalStats: Stats = {
    algorithms: 847,
    earnings: 2.4,
    traders: 12847,
    volume: 892,
};

export default function PlatformStats(): JSX.Element {
    const [stats, setStats] = useState<Stats>({
        algorithms: 0,
        earnings: 0,
        traders: 0,
        volume: 0,
    });

    useEffect(() => {
        const animationDuration = 2000;
        const frameRate = 60;
        const totalFrames = animationDuration / (1000 / frameRate);

        const animateStat = (key: keyof Stats, finalValue: number): void => {
            const increment = finalValue / totalFrames;
            let currentValue = 0;
            const interval = setInterval(() => {
                currentValue += increment;
                if (currentValue >= finalValue) {
                    currentValue = finalValue;
                    clearInterval(interval);
                }
                setStats(prevStats => ({...prevStats, [key]: currentValue}));
            }, 1000 / frameRate);
        };

        animateStat('algorithms', finalStats.algorithms);
        animateStat('earnings', finalStats.earnings);
        animateStat('traders', finalStats.traders);
        animateStat('volume', finalStats.volume);
    }, []);

    return (
        <section className="container mx-auto px-6 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 text-center">
                    <Code className="w-8 h-8 mx-auto mb-3 text-indigo-400"/>
                    <p className="text-3xl font-bold text-white">{Math.floor(stats.algorithms).toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Algorithms Deployed</p>
                </div>
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 text-center">
                    <ChartBar className="w-8 h-8 mx-auto mb-3 text-emerald-400"/>
                    <p className="text-3xl font-bold text-white">${stats.earnings.toFixed(1)}M</p>
                    <p className="text-sm text-gray-400">Community Earnings</p>
                </div>
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 text-center">
                    <Users className="w-8 h-8 mx-auto mb-3 text-sky-400"/>
                    <p className="text-3xl font-bold text-white">{Math.floor(stats.traders).toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Active Traders</p>
                </div>
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 text-center">
                    <Globe className="w-8 h-8 mx-auto mb-3 text-amber-400"/>
                    <p className="text-3xl font-bold text-white">${Math.floor(stats.volume)}K</p>
                    <p className="text-sm text-gray-400">Cross-Chain Volume</p>
                </div>
            </div>
        </section>
    );
};

const Code = ({ className = "w-6 h-6" }: IconProps): JSX.Element => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
  </svg>
);

const Users = ({ className = "w-6 h-6" }: IconProps): JSX.Element => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 0112 13a5.975 5.975 0 013 1.803M15 21a9 9 0 00-9-9m9 9a9 9 0 01-9-9"></path>
  </svg>
);

const Globe = ({ className = "w-6 h-6" }: IconProps): JSX.Element => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 9a9 9 0 00-9-9"></path>
    </svg>
);

const ChartBar = ({ className = "w-6 h-6" }: IconProps): JSX.Element => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
  </svg>
);
