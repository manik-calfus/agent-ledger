"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOutUser } from "@/lib/firebase";
import { initials } from "@/lib/useActiveUsers";
import type { UserProfile } from "@/lib/useAuth";

export default function AppHeader({ profile }: { profile: UserProfile }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const tabs = [
    { href: "/", label: "Ledger", active: pathname === "/" || pathname.startsWith("/ideas") },
    ...(profile.role === "admin"
      ? [{ href: "/admin/users", label: "User management", active: pathname.startsWith("/admin") }]
      : []),
  ];

  return (
    <nav className="topnav" aria-label="Main">
      <div className="topnav-inner">
        <Link href="/" className="wordmark">
          <span className="wordmark-mark" aria-hidden="true">AL</span>
          Agent Ledger
        </Link>

        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              role="tab"
              aria-selected={t.active}
              className={`tab${t.active ? " active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="user-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="avatar">{initials(profile.name || profile.email)}</span>
            <span className="user-trigger-name">{profile.name}</span>
            <span className="caret" aria-hidden="true">▾</span>
          </button>
          {menuOpen && (
            <div className="user-dropdown" role="menu">
              <div className="user-dropdown-head">
                <div className="user-dropdown-name">{profile.name}</div>
                <div className="user-dropdown-email">{profile.email}</div>
                <span className={`pill ${profile.role}`}>{profile.role}</span>
              </div>
              <button type="button" role="menuitem" className="user-dropdown-item" onClick={() => signOutUser()}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
