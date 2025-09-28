"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/lop", label: "LOP" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-gray-900/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-gray-100 tracking-tight">
        <span className="text-indigo-400">Defi</span>QuantHQ
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-gray-800 text-gray-100"
                    : "text-gray-300 hover:text-gray-100 hover:bg-gray-800"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
