"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/useAuth";
import AppHeader from "@/components/AppHeader";

type Idea = {
  title: string;
  link: string;
  desc: string;
  area: string;
  cost: number;
  revenue: number;
  createdAt: number;
  submittedByUid: string;
  submittedByName: string;
  submittedByEmail: string;
};

function fmt(n: number): string {
  const rounded = Math.round(Number(n) || 0);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)}k`;
  return `${sign}$${abs}`;
}

function safeUrl(u: string): string | null {
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch {
    /* ignore */
  }
  return null;
}

export default function IdeaDetail({
  id,
  user,
  profile,
}: {
  id: string;
  user: User;
  profile: UserProfile;
}) {
  const router = useRouter();
  const [idea, setIdea] = useState<Idea | null | undefined>(undefined);

  useEffect(() => {
    if (!db || !id) return;
    const unsub = onSnapshot(
      doc(db, "ideas", id),
      (snap) => setIdea(snap.exists() ? (snap.data() as Idea) : null),
      () => setIdea(null)
    );
    return () => unsub();
  }, [id]);

  async function handleDelete() {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "ideas", id));
      router.push("/");
    } catch {
      /* leave them on the page; nothing to do without a toast system here */
    }
  }

  if (idea === undefined) {
    return (
      <div className="wrap">
        <AppHeader profile={profile} backHref="/" />
        <p className="hint">Loading…</p>
      </div>
    );
  }

  if (idea === null) {
    return (
      <div className="wrap">
        <AppHeader profile={profile} backHref="/" />
        <div className="detail-card">
          <div className="eyebrow">Agent Ledger</div>
          <h1>This idea isn&apos;t here anymore</h1>
          <p className="detail-desc">It may have been removed. Head back to the ledger.</p>
        </div>
      </div>
    );
  }

  const n = (Number(idea.revenue) || 0) - (Number(idea.cost) || 0);
  const url = safeUrl(idea.link);
  const canDelete = idea.submittedByUid === user.uid || profile.role === "admin";

  return (
    <div className="wrap">
      <AppHeader profile={profile} backHref="/" />
      <div className="detail-card">
        <div className="eyebrow">{idea.area || "Other"}</div>
        <h1>{idea.title}</h1>
        <p className="detail-desc">{idea.desc}</p>

        <div className="detail-grid">
          <div className="detail-field">
            <div className="label">Cost to build</div>
            <div className="value num">{fmt(idea.cost)}</div>
          </div>
          <div className="detail-field">
            <div className="label">Revenue potential</div>
            <div className="value num">{fmt(idea.revenue)}</div>
          </div>
          <div className="detail-field">
            <div className="label">Net value</div>
            <div className={`value num ${n >= 0 ? "good" : "bad"}`}>
              {n >= 0 ? "+" : ""}
              {fmt(n)}
            </div>
          </div>
        </div>

        <p className="detail-meta">
          Submitted by {idea.submittedByName}
          {idea.submittedByEmail ? ` (${idea.submittedByEmail})` : ""}
          {idea.createdAt ? ` · ${new Date(idea.createdAt).toLocaleDateString()}` : ""}
        </p>

        <div className="detail-actions">
          {url && (
            <a className="external-btn" href={url} target="_blank" rel="noopener noreferrer">
              Open the agent ↗
            </a>
          )}
          {canDelete && (
            <button type="button" className="del-btn" onClick={handleDelete}>
              Remove from the ledger
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
