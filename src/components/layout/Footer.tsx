import React from "react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t border-neutral-800/40 bg-[var(--background)] text-[var(--foreground)]">
      <div className="container mx-auto py-6 px-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-sm opacity-80">© {year} ETH Delhi. All rights reserved.</p>
        <div className="flex items-center gap-4 text-sm opacity-80">
          <a href="/marketplace" className="hover:opacity-100">Marketplace</a>
          <a href="/stokes" className="hover:opacity-100">Stokes</a>
          <a href="/ide" className="hover:opacity-100">IDE</a>
        </div>
      </div>
    </footer>
  );
}
