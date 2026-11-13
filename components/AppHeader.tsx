"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOutUser } from "@/lib/firebase";
import { initials } from "@/lib/useActiveUsers";
import { useAuth, type UserProfile } from "@/lib/useAuth";
import type { SubmitResult } from "@/components/IdeaForm";
import NewIdeaModal from "@/components/NewIdeaModal";
import NotificationsBell from "@/components/NotificationsBell";

export default function AppHeader({ profile }: { profile: UserProfile }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [toast, setToast] = useState<SubmitResult | null>(null);

  useEffect(() => {
    if (!toast) return;
    // Warnings stay longer — they explain what went wrong.
    const t = setTimeout(() => setToast(null), toast.warn ? 12000 : 5000);
    return () => clearTimeout(t);
  }, [toast]);
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
    { href: "/my-ideas", label: "My ideas", active: pathname.startsWith("/my-ideas") },
    { href: "/insights", label: "Insights", active: pathname.startsWith("/insights") },
    ...(profile.role === "admin"
      ? [{ href: "/admin/users", label: "User management", active: pathname.startsWith("/admin") }]
      : []),
  ];

  return (
    <>
      <nav className="topnav" aria-label="Main">
        <div className="topnav-inner">
          <Link href="/" className="wordmark">
            <span className="wordmark-mark" aria-hidden="true">
              AL
            </span>
            Agent Ledger
          </Link>

          <div className="tabs">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                aria-current={t.active ? "page" : undefined}
                className={`tab${t.active ? " active" : ""}`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <div className="topnav-actions">
            <button type="button" className="new-idea-btn" onClick={() => setNewOpen(true)}>
              <span aria-hidden="true">+</span>
              <span className="new-idea-label">New idea</span>
            </button>

            {user && <NotificationsBell uid={user.uid} joinedAt={profile.createdAt} />}

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
                <span className="caret" aria-hidden="true">
                  ▾
                </span>
              </button>
              {menuOpen && (
                <div className="user-dropdown" role="menu">
                  <div className="user-dropdown-head">
                    <div className="user-dropdown-name">{profile.name}</div>
                    <div className="user-dropdown-email">{profile.email}</div>
                    <span className={`pill ${profile.role}`}>{profile.role}</span>
                  </div>
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="user-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="user-dropdown-item danger"
                    onClick={() => signOutUser()}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {newOpen && user && (
        <NewIdeaModal
          user={user}
          profile={profile}
          onClose={() => setNewOpen(false)}
          onSubmitted={(result) => {
            setNewOpen(false);
            setToast(result);
          }}
        />
      )}

      {toast && (
        <div className={`toast${toast.warn ? " warn" : ""}`} role="status" aria-live="polite">
          <span>{toast.text}</span>
          <button type="button" className="toast-x" aria-label="Dismiss" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
