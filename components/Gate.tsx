"use client";

import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import { useAuth, type UserProfile } from "@/lib/useAuth";
import LoginScreen from "@/components/LoginScreen";
import StatusScreen from "@/components/StatusScreen";
import VerifyEmailScreen from "@/components/VerifyEmailScreen";

export default function Gate({
  requireAdmin = false,
  children,
}: {
  requireAdmin?: boolean;
  children: (args: { user: User; profile: UserProfile }) => ReactNode;
}) {
  const { loading, configured, user, emailVerified, profile } = useAuth();

  if (!configured) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="eyebrow">Agent Ledger</div>
          <h1>Not configured</h1>
          <p>Firebase isn&apos;t set up for this deployment yet.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p className="hint">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  if (!emailVerified) return <VerifyEmailScreen email={user.email} />;

  if (!profile) return <StatusScreen status="no-profile" email={user.email} />;

  if (profile.status !== "active") {
    return <StatusScreen status={profile.status} email={user.email} />;
  }

  if (requireAdmin && profile.role !== "admin") {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="eyebrow">Agent Ledger</div>
          <h1>Admins only</h1>
          <p>This page is for ledger admins. Ask one if you need access changed.</p>
        </div>
      </div>
    );
  }

  return <>{children({ user, profile })}</>;
}
