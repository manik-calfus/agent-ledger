"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/useAuth";
import AppHeader from "@/components/AppHeader";

type Idea = {
  id: string;
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

type SortKey = "net" | "revenue" | "cost" | "new";

const AREAS = ["Sales", "Support", "Engineering", "Marketing", "Finance", "Operations", "HR", "Product", "Other"];

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

function net(it: Idea): number {
  return (Number(it.revenue) || 0) - (Number(it.cost) || 0);
}

async function notifyNewIdea(idToken: string, recipients: string[], idea: Idea) {
  try {
    await fetch("/api/notify-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, recipients, idea }),
    });
  } catch {
    // Best-effort — a failed notification shouldn't block the submission.
  }
}

export default function Ledger({ user, profile }: { user: User; profile: UserProfile }) {
  const [items, setItems] = useState<Idea[]>([]);
  const [activeEmails, setActiveEmails] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("net");

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [desc, setDesc] = useState("");
  const [area, setArea] = useState("");
  const [cost, setCost] = useState("");
  const [revenue, setRevenue] = useState("");
  const [hint, setHint] = useState("Annualized estimate is fine — note your basis in the description.");
  const [hintErr, setHintErr] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "ideas"), orderBy("createdAt", "desc"), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      const next: Idea[] = snap.docs.map((d) => {
        const data = d.data() as Partial<Idea>;
        return {
          id: d.id,
          title: data.title || "Untitled agent",
          link: data.link || "",
          desc: data.desc || "",
          area: data.area || "Other",
          cost: Number(data.cost) || 0,
          revenue: Number(data.revenue) || 0,
          createdAt: Number(data.createdAt) || 0,
          submittedByUid: data.submittedByUid || "",
          submittedByName: data.submittedByName || "Someone",
          submittedByEmail: data.submittedByEmail || "",
        };
      });
      setItems(next);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "users"), where("status", "==", "active"));
    const unsub = onSnapshot(q, (snap) => {
      setActiveEmails(snap.docs.map((d) => (d.data().email as string) || "").filter(Boolean));
    });
    return () => unsub();
  }, []);

  const sorted = useMemo(() => {
    const list = items.slice();
    if (sort === "net") list.sort((a, b) => net(b) - net(a));
    else if (sort === "revenue") list.sort((a, b) => b.revenue - a.revenue);
    else if (sort === "cost") list.sort((a, b) => a.cost - b.cost);
    else if (sort === "new") list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [items, sort]);

  const totals = useMemo(() => {
    const totalCost = items.reduce((s, it) => s + (Number(it.cost) || 0), 0);
    const totalRevenue = items.reduce((s, it) => s + (Number(it.revenue) || 0), 0);
    return { count: items.length, cost: totalCost, revenue: totalRevenue, net: totalRevenue - totalCost };
  }, [items]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const url = safeUrl(link.trim());
    const costNum = Number(cost);
    const revenueNum = Number(revenue);

    if (!url) {
      setHint("That link doesn't look like a valid http(s) URL.");
      setHintErr(true);
      return;
    }
    if (!(costNum >= 0) || !(revenueNum >= 0)) {
      setHint("Cost and revenue need to be zero or more.");
      setHintErr(true);
      return;
    }
    if (!db) {
      setHint("Firebase isn't configured yet, so this won't be saved.");
      setHintErr(true);
      return;
    }
    setHint("Annualized estimate is fine — note your basis in the description.");
    setHintErr(false);
    setSubmitting(true);
    try {
      const newIdea = {
        title: title.trim(),
        link: url,
        desc: desc.trim(),
        area,
        cost: costNum,
        revenue: revenueNum,
        createdAt: Date.now(),
        submittedByUid: user.uid,
        submittedByName: profile.name,
        submittedByEmail: profile.email,
      };
      await addDoc(collection(db, "ideas"), newIdea);
      setTitle("");
      setLink("");
      setDesc("");
      setArea("");
      setCost("");
      setRevenue("");

      const idToken = await user.getIdToken();
      void notifyNewIdea(idToken, activeEmails, newIdea as Idea);
    } catch {
      setHint("Couldn't save that — try again in a moment.");
      setHintErr(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!db || !id) return;
    try {
      await deleteDoc(doc(db, "ideas", id));
    } catch {
      /* leave the row; a stale delete will just fail quietly */
    }
  }

  const netClass = totals.net >= 0 ? "good" : "bad";

  return (
    <div className="wrap">
      <AppHeader profile={profile} />

      <header className="top">
        <div className="title-block">
          <div className="eyebrow">Internal · Build vs. Return</div>
          <h1>Agent Ledger</h1>
          <p>
            Pitch an AI agent, price what it takes to build, and project what it returns. Sorted by net
            value so the best bets rise to the top.
          </p>
        </div>
      </header>

      <section className="stats" aria-label="Portfolio totals">
        <div className="stat">
          <div className="label">Ideas logged</div>
          <div className="value num">{totals.count}</div>
        </div>
        <div className="stat">
          <div className="label">Total build cost</div>
          <div className="value num">{fmt(totals.cost)}</div>
        </div>
        <div className="stat">
          <div className="label">Total projected revenue</div>
          <div className="value num">{fmt(totals.revenue)}</div>
        </div>
        <div className="stat">
          <div className="label">Net projected value</div>
          <div className={`value num ${netClass}`}>
            {totals.net >= 0 ? "+" : ""}
            {fmt(totals.net)}
          </div>
        </div>
      </section>

      <div className="board">
        <form className="panel" onSubmit={handleSubmit}>
          <h2>Submit an idea</h2>
          <p className="sub">Every field feeds the ledger — be realistic with the numbers.</p>

          <div className="field">
            <label htmlFor="f-title">Agent name</label>
            <input
              id="f-title"
              type="text"
              maxLength={80}
              placeholder="e.g. Invoice Triage Agent"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="f-link">Link to the agent / spec / prototype</label>
            <input
              id="f-link"
              type="url"
              placeholder="https://…"
              required
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <div className="hint">Repo, doc, demo — wherever someone can go look.</div>
          </div>

          <div className="field">
            <label htmlFor="f-desc">Description</label>
            <textarea
              id="f-desc"
              maxLength={400}
              placeholder="What does it do, and who does it do it for?"
              required
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="f-area">Targeted area</label>
            <select id="f-area" required value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="" disabled>
                Choose an area…
              </option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="two-col">
            <div className="field">
              <label htmlFor="f-cost">Cost to build</label>
              <div className="amount-input">
                <span>$</span>
                <input
                  id="f-cost"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  required
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="f-revenue">Revenue potential</label>
              <div className="amount-input">
                <span>$</span>
                <input
                  id="f-revenue"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  required
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className={`hint${hintErr ? " err" : ""}`}>{hint}</div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Adding…" : "Add to the ledger"}
          </button>
        </form>

        <div>
          <div className="list-head">
            <h2>The ledger</h2>
            <div className="sort-group" role="group" aria-label="Sort ideas">
              {([
                ["net", "Net value"],
                ["revenue", "Revenue"],
                ["cost", "Cost"],
                ["new", "Newest"],
              ] as [SortKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`sort-btn${sort === key ? " active" : ""}`}
                  onClick={() => setSort(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="ledger">
            <div className="lrow head">
              <div>Idea</div>
              <div>Area</div>
              <div style={{ textAlign: "right" }}>Cost</div>
              <div style={{ textAlign: "right" }}>Revenue</div>
              <div style={{ textAlign: "right" }}>Net</div>
              <div />
            </div>

            {sorted.map((it, i) => {
              const n = net(it);
              const canDelete = it.submittedByUid === user.uid || profile.role === "admin";
              return (
                <div className={`lrow${i % 2 ? " odd" : ""}`} key={it.id}>
                  <div>
                    <div className="idea-title">
                      <Link href={`/ideas/${it.id}`}>{it.title}</Link>
                    </div>
                    <div className="idea-desc">{it.desc}</div>
                    <div className="idea-meta">Submitted by {it.submittedByName}</div>
                  </div>
                  <div>
                    <span className="badge">{it.area}</span>
                  </div>
                  <div className="amt">
                    <span className="cap">Cost</span>
                    <span className="num">{fmt(it.cost)}</span>
                  </div>
                  <div className="amt">
                    <span className="cap">Revenue</span>
                    <span className="num">{fmt(it.revenue)}</span>
                  </div>
                  <div className="amt">
                    <span className="cap">Net</span>
                    <span className={`net-pill num ${n >= 0 ? "good" : "bad"}`}>
                      {n >= 0 ? "+" : ""}
                      {fmt(n)}
                    </span>
                  </div>
                  <div className="row-actions">
                    {canDelete && (
                      <button type="button" className="del-btn" onClick={() => handleDelete(it.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {!items.length && (
              <div className="empty-note">No ideas yet — be the first to submit one on the left.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
