"use client";

import { useState, type FormEvent } from "react";
import { addDoc, collection } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { AREAS, safeUrl } from "@/lib/format";
import type { UserProfile } from "@/lib/useAuth";
import { useActiveUsers, type Person } from "@/lib/useActiveUsers";
import ContributorPicker from "@/components/ContributorPicker";

const DEFAULT_HINT = "Annualized estimate is fine — note your basis in the description.";

const NOTIFY_ERRORS: Record<string, string> = {
  not_configured: "email isn't set up on this deployment yet (missing environment variables)",
  graph_auth_failed: "the email service rejected its credentials",
  send_failed: "the email service refused to send it",
  invalid_token: "your session couldn't be verified",
  missing_token: "your session couldn't be verified",
};

type NotifyResult = { ok: true; sent: number } | { ok: false; reason: string };

async function notifyNewIdea(idToken: string, recipients: string[], idea: object): Promise<NotifyResult> {
  try {
    const res = await fetch("/api/notify-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, recipients, idea }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, sent: Number(body.sent) || 0 };
    return { ok: false, reason: NOTIFY_ERRORS[body.error] || `the server returned ${res.status}` };
  } catch {
    return { ok: false, reason: "the server couldn't be reached" };
  }
}

export default function IdeaForm({
  user,
  profile,
  idPrefix,
  onSubmitted,
}: {
  user: User;
  profile: UserProfile;
  idPrefix: string;
  onSubmitted?: () => void;
}) {
  const people = useActiveUsers();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [desc, setDesc] = useState("");
  const [area, setArea] = useState("");
  const [cost, setCost] = useState("");
  const [revenue, setRevenue] = useState("");
  const [contacts, setContacts] = useState<Person[]>([]);
  const [hint, setHint] = useState(DEFAULT_HINT);
  const [hintErr, setHintErr] = useState(false);
  const [result, setResult] = useState<{ text: string; warn: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const id = (name: string) => `${idPrefix}-${name}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
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
    if (!db) return;

    setHint(DEFAULT_HINT);
    setHintErr(false);
    setSubmitting(true);
    try {
      const now = Date.now();
      const newIdea = {
        title: title.trim(),
        link: url.href,
        desc: desc.trim(),
        area,
        cost: costNum,
        revenue: revenueNum,
        createdAt: now,
        updatedAt: now,
        submittedByUid: user.uid,
        submittedByName: profile.name,
        submittedByEmail: profile.email,
        contributors: contacts,
        contributorUids: contacts.map((p) => p.uid),
      };
      await addDoc(collection(db, "ideas"), newIdea);
      setTitle("");
      setLink("");
      setDesc("");
      setArea("");
      setCost("");
      setRevenue("");
      setContacts([]);

      const recipients = people.filter((p) => p.notifyEmail).map((p) => p.email);
      const idToken = await user.getIdToken();
      const notify = await notifyNewIdea(idToken, recipients, newIdea);
      setResult(
        notify.ok
          ? {
              text: notify.sent
                ? `Added to the ledger. Emailed ${notify.sent} ${notify.sent === 1 ? "person" : "people"}.`
                : "Added to the ledger. Nobody has email notifications switched on.",
              warn: false,
            }
          : { text: `Added to the ledger, but the notification email didn't go out — ${notify.reason}.`, warn: true }
      );
      onSubmitted?.();
    } catch {
      setHint("Couldn't save that — try again in a moment.");
      setHintErr(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor={id("title")}>Agent name</label>
        <input
          id={id("title")}
          type="text"
          maxLength={80}
          placeholder="e.g. Invoice Triage Agent"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor={id("link")}>Link to the agent / spec / prototype</label>
        <input
          id={id("link")}
          type="url"
          placeholder="https://…"
          required
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <div className="hint">Repo, doc, demo — wherever someone can go look.</div>
      </div>

      <div className="field">
        <label htmlFor={id("desc")}>Description</label>
        <textarea
          id={id("desc")}
          maxLength={400}
          placeholder="What does it do, and who does it do it for?"
          required
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor={id("area")}>Targeted area</label>
        <select id={id("area")} required value={area} onChange={(e) => setArea(e.target.value)}>
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
          <label htmlFor={id("cost")}>Cost to build</label>
          <div className="amount-input">
            <span>$</span>
            <input
              id={id("cost")}
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
          <label htmlFor={id("revenue")}>Revenue potential</label>
          <div className="amount-input">
            <span>$</span>
            <input
              id={id("revenue")}
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

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor={id("contacts")}>Points of contact (optional)</label>
        <ContributorPicker id={id("contacts")} people={people} value={contacts} onChange={setContacts} />
      </div>

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? "Adding…" : "Add to the ledger"}
      </button>

      {result && (
        <div className={`form-result${result.warn ? " warn" : ""}`} role="status">
          {result.text}
        </div>
      )}
    </form>
  );
}
