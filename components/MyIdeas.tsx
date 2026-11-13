"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { User } from "firebase/auth";
import { fmt, fmtSigned, timeAgo } from "@/lib/format";
import type { UserProfile } from "@/lib/useAuth";
import { net, useIdeas, type Idea } from "@/lib/useIdeas";
import AppHeader from "@/components/AppHeader";

function IdeaRows({ ideas }: { ideas: Idea[] }) {
  return (
    <ul className="compact-list">
      {ideas.map((it) => {
        const n = net(it);
        return (
          <li key={it.id}>
            <Link href={`/ideas/${it.id}`} className="compact-row">
              <span className="compact-main">
                <span className="compact-title">{it.title}</span>
                <span className="compact-sub">
                  {it.area} · added {timeAgo(it.createdAt)}
                  {it.contributors.length > 0 &&
                    ` · ${it.contributors.length} point${it.contributors.length === 1 ? "" : "s"} of contact`}
                </span>
              </span>
              <span className="compact-nums num">
                <span className="compact-cost">
                  {fmt(it.cost)} → {fmt(it.revenue)}
                </span>
                <span className={`net-pill ${n >= 0 ? "good" : "bad"}`}>{fmtSigned(n)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function MyIdeas({ user, profile }: { user: User; profile: UserProfile }) {
  const { ideas, loaded } = useIdeas();

  const mine = useMemo(() => ideas.filter((it) => it.submittedByUid === user.uid), [ideas, user.uid]);
  const contact = useMemo(
    () => ideas.filter((it) => it.contributorUids.includes(user.uid) && it.submittedByUid !== user.uid),
    [ideas, user.uid]
  );
  const mineNet = mine.reduce((s, it) => s + net(it), 0);

  return (
    <>
      <AppHeader profile={profile} />
      <div className="wrap">
        <header className="top">
          <div className="title-block">
            <div className="eyebrow">Your work</div>
            <h1>My ideas</h1>
            <p>Everything you&apos;ve pitched, plus the ideas where you&apos;re someone&apos;s point of contact.</p>
          </div>
        </header>

        <section className="stats three" aria-label="Your totals">
          <div className="stat">
            <div className="label">Ideas you submitted</div>
            <div className="value num">{mine.length}</div>
          </div>
          <div className="stat">
            <div className="label">Their net value</div>
            <div className={`value num ${mineNet >= 0 ? "good" : "bad"}`}>{fmtSigned(mineNet)}</div>
          </div>
          <div className="stat">
            <div className="label">You&apos;re a contact on</div>
            <div className="value num">{contact.length}</div>
          </div>
        </section>

        <section className="my-section">
          <h2>Submitted by you</h2>
          {mine.length ? (
            <IdeaRows ideas={mine} />
          ) : (
            loaded && (
              <p className="empty-inline">
                You haven&apos;t submitted anything yet. Use <strong>+ New idea</strong> at the top to pitch one.
              </p>
            )
          )}
        </section>

        <section className="my-section">
          <h2>You&apos;re a point of contact</h2>
          {contact.length ? (
            <IdeaRows ideas={contact} />
          ) : (
            loaded && <p className="empty-inline">No one has listed you as a point of contact yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
