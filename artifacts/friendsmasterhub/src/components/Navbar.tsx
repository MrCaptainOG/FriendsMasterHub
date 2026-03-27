import { useState } from "react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/gallery", label: "Gallery" },
  { href: "/submit", label: "Submit Build" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <img
              src="https://i.ibb.co/4nyMLy4d/Minecraft-friends-hub-logo-design.png"
              alt="FriendsMasterHub"
              className="h-9 w-9 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="font-bold text-lg hidden sm:block">
              Friends<span className="text-primary">Master</span>Hub
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </button>
              </Link>
            );
          })}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-secondary transition-all"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const active = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
