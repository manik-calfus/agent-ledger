"use client";

import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { resetPassword, signIn, signUp } from "@/lib/firebase";

type Mode = "signin" | "signup" | "reset";

function friendlyError(e: unknown): string {
  const code = e instanceof FirebaseError ? e.code : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match an account.";
    case "auth/email-already-in-use":
      return "There's already an account with that email — sign in instead.";
    case "auth/weak-password":
      return "Use at least 6 characters for your password.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    case "auth/operation-not-allowed":
      return "Email sign-in isn't switched on for this project yet — an admin needs to enable it in Firebase.";
    default:
      return "Something went wrong — try again.";
  }
}

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else if (mode === "signup") {
        await signUp(name, email, password);
      } else {
        await resetPassword(email);
        setNotice("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const heading =
    mode === "signin" ? "Sign in" : mode === "signup" ? "Create an account" : "Reset your password";
  const cta =
    mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link";

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="eyebrow">Agent Ledger</div>
        <h1>{heading}</h1>
        <p>
          {mode === "signup"
            ? "New accounts need an admin's approval before they can see the ledger."
            : mode === "reset"
              ? "We'll email you a link to set a new password."
              : "Sign in to view and submit agent ideas."}
        </p>

        <div className="auth-fields">
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="a-name">Full name</label>
              <input
                id="a-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="a-email">Work email</label>
            <input
              id="a-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode !== "reset" && (
            <div className="field">
              <label htmlFor="a-password">Password</label>
              <input
                id="a-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && <div className="hint err">{error}</div>}
        {notice && <div className="hint">{notice}</div>}

        <button type="submit" className="submit-btn" disabled={busy}>
          {busy ? "Working…" : cta}
        </button>

        <div className="auth-links">
          {mode === "signin" && (
            <>
              <button type="button" className="link-btn" onClick={() => switchMode("signup")}>
                Create an account
              </button>
              <button type="button" className="link-btn" onClick={() => switchMode("reset")}>
                Forgot password?
              </button>
            </>
          )}
          {mode !== "signin" && (
            <button type="button" className="link-btn" onClick={() => switchMode("signin")}>
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
