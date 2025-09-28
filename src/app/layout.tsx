import Providers from "@/components/providers"; // your provider that includes WagmiProvider, RainbowKitProvider
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cross-Chain RWA Tokenization Platform",
  description: "Tokenize and manage real-world assets across 5 testnet chains with seamless cross-chain bridging",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers> {/* Wrap children in Providers */}
      </body>
    </html>
  );
}
