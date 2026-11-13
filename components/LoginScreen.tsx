"use client";

import { useState } from "react";
import { signInWithMicrosoft } from "@/lib/firebase";

export default function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithMicrosoft();
    } catch (e) {
      setError("Sign-in didn't go through — try again.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="eyebrow">Internal · Build vs. Return</div>
        <h1>Agent Ledger</h1>
        <p>Sign in with your Calfus Microsoft account to view and submit agent ideas.</p>
        <button type="button" className="ms-btn" onClick={handleSignIn} disabled={signingIn}>
          <MicrosoftMark />
          {signingIn ? "Signing in…" : "Sign in with Microsoft"}
        </button>
        {error && <div className="hint err">{error}</div>}
      </div>
    </div>
  );
}

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
