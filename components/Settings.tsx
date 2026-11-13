"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, resetPassword } from "@/lib/firebase";
import type { UserProfile } from "@/lib/useAuth";
import AppHeader from "@/components/AppHeader";

export default function Settings({ user, profile }: { user: User; profile: UserProfile }) {
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      setNotifyEmail(snap.data()?.notifyEmail !== false);
    });
  }, [user.uid]);

  async function toggleNotify(next: boolean) {
    if (!db) return;
    setNotifyEmail(next);
    setSaving(true);
    setMsg(null);
    try {
      await updateDoc(doc(db, "users", user.uid), { notifyEmail: next, updatedAt: Date.now() });
      setMsg({ text: next ? "You'll get an email for each new idea." : "Email notifications are off.", err: false });
    } catch {
      setNotifyEmail(!next);
      setMsg({ text: "Couldn't save that — try again.", err: true });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetMsg(null);
    try {
      await resetPassword(profile.email);
      setResetMsg(`Sent a password reset link to ${profile.email}.`);
    } catch {
      setResetMsg("Couldn't send that just now — try again in a minute.");
    }
  }

  return (
    <>
      <AppHeader profile={profile} />
      <div className="wrap settings-wrap">
        <header className="top">
          <div className="title-block">
            <div className="eyebrow">Account</div>
            <h1>Settings</h1>
          </div>
        </header>

        <section className="settings-card">
          <h2>Profile</h2>
          <dl className="settings-dl">
            <div>
              <dt>Name</dt>
              <dd>{profile.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>
                <span className={`pill ${profile.role}`}>{profile.role}</span>
              </dd>
            </div>
          </dl>
          <p className="hint">To change your name or role, ask an admin.</p>
        </section>

        <section className="settings-card">
          <h2>Notifications</h2>
          <label className="toggle-row">
            <span>
              <span className="toggle-title">Email me when someone submits a new idea</span>
              <span className="toggle-sub">The in-app bell keeps working either way.</span>
            </span>
            <input
              type="checkbox"
              className="switch"
              role="switch"
              checked={notifyEmail}
              disabled={saving}
              onChange={(e) => toggleNotify(e.target.checked)}
            />
          </label>
          {msg && <div className={`hint${msg.err ? " err" : ""}`}>{msg.text}</div>}
        </section>

        <section className="settings-card">
          <h2>Password</h2>
          <p className="toggle-sub">We&apos;ll email you a link to choose a new password.</p>
          <button type="button" className="btn-outline" onClick={handleReset}>
            Send password reset link
          </button>
          {resetMsg && <div className="hint">{resetMsg}</div>}
        </section>
      </div>
    </>
  );
}
