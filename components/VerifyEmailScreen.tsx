"use client";

import { useState } from "react";
import { resendVerification, signOutUser } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

export default function VerifyEmailScreen({ email }: { email: string | null }) {
  const { refresh } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCheck() {
    setBusy(true);
    setMessage(null);
    try {
      await refresh();
      setMessage("Still not verified — click the link in the email, then try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setMessage(null);
    try {
      await resendVerification();
      setMessage("Sent another verification email.");
    } catch {
      setMessage("Couldn't resend just now — wait a minute and try again.");
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="eyebrow">Agent Ledger</div>
        <h1>Verify your email</h1>
        <p>
          We sent a verification link to <strong>{email}</strong>. Click it, then come back here.
          Check spam if it&apos;s not in your inbox.
        </p>
        {message && <div className="hint">{message}</div>}
        <button type="button" className="submit-btn" onClick={handleCheck} disabled={busy}>
          {busy ? "Checking…" : "I've verified my email"}
        </button>
        <div className="auth-links">
          <button type="button" className="link-btn" onClick={handleResend}>
            Resend email
          </button>
          <button type="button" className="link-btn" onClick={() => signOutUser()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
