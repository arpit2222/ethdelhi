import React from 'react';
import FeaturedAlgorithmsSection from "../FeaturedAlgorithmsSection/FeaturedAlgorithmsSection";
import Footer from "../Footer/Footer";
import Hero from "../Hero/Hero";
import LiveActivityFeed from "../LiveActivityFeed/LiveActivityFeed";
import Navbar from "../Navbar/Navbar";
import PlatformStats from "../PlatofrmStats/PlatformStats";

interface LandingAlgorithm {
  name: string;
  creator: string;
  return: number;
  risk: 'Low' | 'Medium' | 'High';
  subscribers: number;
  tvl: number;
}

interface Activity {
  type: string;
  details: string;
  time: string;
}

function Landing() {
  const featuredAlgorithms: LandingAlgorithm[] = [
    { name: "Momentum King", creator: "0xAlpha", return: 18.2, risk: "Medium", subscribers: 1024, tvl: 750000 },
    { name: "Arbitrage Eagle", creator: "ChainRunner", return: 9.8, risk: "Low", subscribers: 2500, tvl: 2100000 },
    { name: "RWA Trend Rider", creator: "YieldGuru", return: 25.1, risk: "High", subscribers: 450, tvl: 320000 },
  ];

  const liveActivity: Activity[] = [
    { type: "Arbitrage Capture", details: "ETH/SUI - $25.10 Profit", time: "5s ago" },
    { type: "New Deployment", details: "Grid Trader v1.2 by 0xQuant", time: "12s ago" },
    { type: "Profit Distribution", details: "Momentum King - 0.5% to holders", time: "28s ago" },
    { type: "Cross-Chain Swap", details: "TSLAx (ETH) -> AAPLx (SUI)", time: "45s ago" },
  ];

  return (
    <div className="bg-gray-900 text-gray-100 font-sans antialiased">
      <Navbar />
      <main>
        <Hero />
        <PlatformStats />
        <FeaturedAlgorithmsSection algorithms={featuredAlgorithms} />
        <LiveActivityFeed activities={liveActivity} />
      </main>
      <Footer />
    </div>
  )
}

export default Landing
