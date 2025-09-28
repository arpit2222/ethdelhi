"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const links: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/ide", label: "IDE" },
  { href: "/stokes", label: "Stokes" },
  { href: "/lop", label: "LOP" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-neutral-800/40 bg-[var(--background)] text-[var(--foreground)]">
      <nav className="container mx-auto flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold">
          <span className="text-indigo-400">Defi</span>QuantHQ
          </Link>
        </div>
        <ul className="hidden md:flex items-center gap-6">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    `px-2 py-1 rounded transition-colors ` +
                    (active
                      ? "text-white bg-neutral-800"
                      : "text-[var(--foreground)] hover:text-white hover:bg-neutral-800/60")
                  }
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-3">
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </nav>
    </header>
  );
}
