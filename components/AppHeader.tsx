"use client";

import Link from "next/link";
import { signOutUser } from "@/lib/firebase";
import type { UserProfile } from "@/lib/useAuth";

export default function AppHeader({
  profile,
  backHref,
}: {
  profile: UserProfile;
  backHref?: string;
}) {
  return (
    <div className="app-header">
      <div className="app-header-left">
        {backHref ? (
          <Link href={backHref} className="back-link">
            ← Back to the ledger
          </Link>
        ) : (
          <span className="app-header-title">Agent Ledger</span>
        )}
      </div>
      <div className="app-header-right">
        {profile.role === "admin" && (
          <Link href="/admin/users" className="nav-link">
            User management
          </Link>
        )}
        <span className="user-chip" title={profile.email}>
          {profile.name}
        </span>
        <button type="button" className="sign-out-btn" onClick={() => signOutUser()}>
          Sign out
        </button>
      </div>
    </div>
  );
}
