"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { timeAgo } from "@/lib/format";
import { useIdeas } from "@/lib/useIdeas";
import { useUserState } from "@/lib/useUserState";

type Item = {
  key: string;
  ideaId: string;
  title: string;
  text: string;
  at: number;
};

export default function NotificationsBell({ uid, joinedAt }: { uid: string; joinedAt: number }) {
  const { ideas } = useIdeas();
  const { lastSeenAt, loaded, markSeen } = useUserState(uid);
  const [open, setOpen] = useState(false);
  // Freeze the "unread" cut-off while the panel is open, so items don't lose
  // their highlight the instant markSeen() lands.
  const [seenCutoff, setSeenCutoff] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const it of ideas) {
      if (it.submittedByUid === uid) continue;
      out.push({
        key: `new-${it.id}`,
        ideaId: it.id,
        title: it.title,
        text: `${it.submittedByName} submitted a new idea`,
        at: it.createdAt,
      });
      if (it.contributorUids.includes(uid)) {
        out.push({
          key: `contact-${it.id}`,
          ideaId: it.id,
          title: it.title,
          text: "You were listed as a point of contact",
          at: it.updatedAt,
        });
      }
    }
    return out.sort((a, b) => b.at - a.at).slice(0, 15);
  }, [ideas, uid]);

  // New members shouldn't open the app to a backlog of "unread" history.
  const cutoff = Math.max(seenCutoff ?? lastSeenAt, joinedAt || 0);
  const unread = loaded ? items.filter((i) => i.at > cutoff).length : 0;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      setSeenCutoff(null);
      return;
    }
    setSeenCutoff(Math.max(lastSeenAt, joinedAt || 0));
    setOpen(true);
    if (unread > 0) void markSeen();
  }

  return (
    <div className="bell" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 9a6 6 0 1112 0c0 5 2 6.5 2 6.5H4S6 14 6 9zM10 19.5a2 2 0 004 0"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && <span className="bell-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-head">Notifications</div>
          {items.length === 0 ? (
            <p className="bell-empty">Nothing yet. New ideas from others will show up here.</p>
          ) : (
            <ul className="bell-list">
              {items.map((i) => (
                <li key={i.key} className={i.at > cutoff ? "unread" : ""}>
                  <Link href={`/ideas/${i.ideaId}`} onClick={() => setOpen(false)}>
                    <span className="bell-text">{i.text}</span>
                    <span className="bell-title">{i.title}</span>
                    <span className="bell-time">{timeAgo(i.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
