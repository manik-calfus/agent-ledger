"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/useAuth";
import { initials, useActiveUsers, type Person } from "@/lib/useActiveUsers";
import AppHeader from "@/components/AppHeader";
import ContributorPicker from "@/components/ContributorPicker";
import ShareModal from "@/components/ShareModal";

type Idea = {
  title: string;
  link: string;
  desc: string;
  area: string;
  cost: number;
  revenue: number;
  createdAt: number;
  updatedAt?: number;
  submittedByUid: string;
  submittedByName: string;
  submittedByEmail: string;
  contributors?: Person[];
  contributorUids?: string[];
};

function fmt(n: number): string {
  const rounded = Math.round(Number(n) || 0);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)}k`;
  return `${sign}$${abs}`;
}

function safeUrl(u: string): URL | null {
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeDays(ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
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
  const people = useActiveUsers();
  const [idea, setIdea] = useState<Idea | null | undefined>(undefined);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingContacts, setEditingContacts] = useState(false);
  const [draftContacts, setDraftContacts] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(window.location.href);
  }, [id]);

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
    if (!window.confirm("Remove this idea from the ledger? This can't be undone.")) return;
    try {
      await deleteDoc(doc(db, "ideas", id));
      router.push("/");
    } catch {
      /* stays on the page */
    }
  }

  async function saveContacts() {
    if (!db) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateDoc(doc(db, "ideas", id), {
        contributors: draftContacts,
        contributorUids: draftContacts.map((p) => p.uid),
        updatedAt: Date.now(),
      });
      setEditingContacts(false);
    } catch {
      setSaveError("Couldn't save — only the submitter, existing points of contact, or an admin can edit this.");
    } finally {
      setSaving(false);
    }
  }

  if (idea === undefined) {
    return (
      <>
        <AppHeader profile={profile} />
        <div className="wrap">
          <p className="hint">Loading…</p>
        </div>
      </>
    );
  }

  if (idea === null) {
    return (
      <>
        <AppHeader profile={profile} />
        <div className="wrap">
          <Link href="/" className="back-link">
            ← Back to the ledger
          </Link>
          <div className="detail-card" style={{ marginTop: 16 }}>
            <h1>This idea isn&apos;t here anymore</h1>
            <p className="detail-desc">It may have been removed.</p>
          </div>
        </div>
      </>
    );
  }

  const cost = Number(idea.cost) || 0;
  const revenue = Number(idea.revenue) || 0;
  const n = revenue - cost;
  const multiple = cost > 0 ? revenue / cost : null;
  const url = safeUrl(idea.link);
  const contacts = idea.contributors || [];
  const isOwner = idea.submittedByUid === user.uid;
  const isAdmin = profile.role === "admin";
  const canEditContacts = isOwner || isAdmin || (idea.contributorUids || []).includes(user.uid);

  return (
    <>
      <AppHeader profile={profile} />
      <div className="wrap detail-wrap">
        <Link href="/" className="back-link">
          ← Back to the ledger
        </Link>

        <div className="detail-layout">
          <article className="detail-card">
            <div className="detail-head">
              <div>
                <span className="badge">{idea.area || "Other"}</span>
                <h1>{idea.title}</h1>
              </div>
              <div className="detail-head-actions">
                <button type="button" className="btn-outline" onClick={() => setShareOpen(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Share
                </button>
                {url && (
                  <a className="external-btn" href={url.href} target="_blank" rel="noopener noreferrer">
                    Open the agent ↗
                  </a>
                )}
              </div>
            </div>

            <p className="detail-desc">{idea.desc}</p>

            <div className="detail-grid">
              <div className="detail-field">
                <div className="label">Cost to build</div>
                <div className="value num">{fmt(cost)}</div>
              </div>
              <div className="detail-field">
                <div className="label">Revenue potential</div>
                <div className="value num">{fmt(revenue)}</div>
              </div>
              <div className="detail-field">
                <div className="label">Net value</div>
                <div className={`value num ${n >= 0 ? "good" : "bad"}`}>
                  {n >= 0 ? "+" : ""}
                  {fmt(n)}
                </div>
              </div>
              <div className="detail-field">
                <div className="label">Return multiple</div>
                <div className="value num">{multiple === null ? "—" : `${multiple.toFixed(1)}×`}</div>
              </div>
            </div>

            <section className="detail-section">
              <div className="section-head">
                <h2>Points of contact</h2>
                {canEditContacts && !editingContacts && (
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => {
                      setDraftContacts(contacts);
                      setEditingContacts(true);
                      setSaveError(null);
                    }}
                  >
                    {contacts.length ? "Edit" : "Add people"}
                  </button>
                )}
              </div>

              {editingContacts ? (
                <div>
                  <ContributorPicker
                    id="detail-contacts"
                    people={people}
                    value={draftContacts}
                    onChange={setDraftContacts}
                  />
                  {saveError && <div className="hint err">{saveError}</div>}
                  <div className="inline-actions">
                    <button type="button" className="btn-small" onClick={() => setEditingContacts(false)}>
                      Cancel
                    </button>
                    <button type="button" className="btn-small primary" onClick={saveContacts} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              ) : contacts.length ? (
                <ul className="people-list">
                  {contacts.map((p) => (
                    <li key={p.uid}>
                      <span className="avatar">{initials(p.name || p.email)}</span>
                      <span>
                        <span className="person-name">{p.name || p.email}</span>
                        <a className="person-email" href={`mailto:${p.email}`}>
                          {p.email}
                        </a>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-inline">
                  No one listed yet{canEditContacts ? " — add the people to talk to about this agent." : "."}
                </p>
              )}
            </section>
          </article>

          <aside className="detail-side">
            <dl className="meta-list">
              <div>
                <dt>Submitted by</dt>
                <dd>
                  <span className="person-inline">
                    <span className="avatar sm">{initials(idea.submittedByName || idea.submittedByEmail)}</span>
                    {idea.submittedByName}
                  </span>
                  {idea.submittedByEmail && (
                    <a className="person-email" href={`mailto:${idea.submittedByEmail}`}>
                      {idea.submittedByEmail}
                    </a>
                  )}
                </dd>
              </div>
              {idea.createdAt > 0 && (
                <div>
                  <dt>Date added</dt>
                  <dd>
                    {formatDate(idea.createdAt)}
                    <span className="meta-sub">{relativeDays(idea.createdAt)}</span>
                  </dd>
                </div>
              )}
              {idea.updatedAt && idea.updatedAt !== idea.createdAt && (
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatDate(idea.updatedAt)}</dd>
                </div>
              )}
              <div>
                <dt>Targeted area</dt>
                <dd>{idea.area || "Other"}</dd>
              </div>
              {url && (
                <div>
                  <dt>Link</dt>
                  <dd>
                    <a href={url.href} target="_blank" rel="noopener noreferrer" className="meta-link">
                      {url.hostname}
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {(isOwner || isAdmin) && (
              <button type="button" className="danger-link" onClick={handleDelete}>
                Remove from the ledger
              </button>
            )}
          </aside>
        </div>
      </div>

      {shareOpen && <ShareModal url={shareUrl} title={idea.title} onClose={() => setShareOpen(false)} />}
    </>
  );
}
