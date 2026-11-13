"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { AREAS, fmt, fmtSigned } from "@/lib/format";
import type { UserProfile } from "@/lib/useAuth";
import { net, useIdeas } from "@/lib/useIdeas";
import AppHeader from "@/components/AppHeader";
import IdeaForm from "@/components/IdeaForm";

type SortKey = "net" | "revenue" | "cost" | "new";
type ValueFilter = "all" | "profitable" | "loss";

export default function Ledger({ user, profile }: { user: User; profile: UserProfile }) {
  const { ideas, loaded } = useIdeas();
  const [sort, setSort] = useState<SortKey>("net");
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  // "all" | "mine" | "contact" | "user:<uid>"
  const [personFilter, setPersonFilter] = useState("all");
  const [valueFilter, setValueFilter] = useState<ValueFilter>("all");

  const filtersActive =
    search.trim() !== "" || areaFilter !== "all" || personFilter !== "all" || valueFilter !== "all";

  function clearFilters() {
    setSearch("");
    setAreaFilter("all");
    setPersonFilter("all");
    setValueFilter("all");
  }

  // Everyone who appears on an idea, as submitter or point of contact.
  const peopleOnIdeas = useMemo(() => {
    const byUid = new Map<string, string>();
    for (const it of ideas) {
      if (it.submittedByUid) byUid.set(it.submittedByUid, it.submittedByName);
      for (const c of it.contributors) if (c.uid && !byUid.has(c.uid)) byUid.set(c.uid, c.name || c.email);
    }
    return Array.from(byUid, ([uid, name]) => ({ uid, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [ideas]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = ideas.filter((it) => {
      if (areaFilter !== "all" && it.area !== areaFilter) return false;
      if (personFilter === "mine" && it.submittedByUid !== user.uid) return false;
      if (personFilter === "contact" && !it.contributorUids.includes(user.uid)) return false;
      if (personFilter.startsWith("user:")) {
        const uid = personFilter.slice(5);
        if (it.submittedByUid !== uid && !it.contributorUids.includes(uid)) return false;
      }
      if (valueFilter === "profitable" && net(it) <= 0) return false;
      if (valueFilter === "loss" && net(it) > 0) return false;
      if (
        q &&
        !it.title.toLowerCase().includes(q) &&
        !it.desc.toLowerCase().includes(q) &&
        !it.submittedByName.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    if (sort === "net") list.sort((a, b) => net(b) - net(a));
    else if (sort === "revenue") list.sort((a, b) => b.revenue - a.revenue);
    else if (sort === "cost") list.sort((a, b) => a.cost - b.cost);
    else list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [ideas, sort, search, areaFilter, personFilter, valueFilter, user.uid]);

  const totals = useMemo(() => {
    const cost = ideas.reduce((s, it) => s + it.cost, 0);
    const revenue = ideas.reduce((s, it) => s + it.revenue, 0);
    return { count: ideas.length, cost, revenue, net: revenue - cost };
  }, [ideas]);

  async function handleDelete(id: string) {
    if (!db || !id) return;
    if (!window.confirm("Remove this idea from the ledger? This can't be undone.")) return;
    try {
      await deleteDoc(doc(db, "ideas", id));
    } catch {
      /* stale delete fails quietly */
    }
  }

  return (
    <>
      <AppHeader profile={profile} />
      <div className="wrap">
        <header className="top">
          <div className="title-block">
            <div className="eyebrow">Internal · Build vs. Return</div>
            <h1>Agent Ledger</h1>
            <p>
              Pitch an AI agent, price what it takes to build, and project what it returns. Sorted by
              net value so the best bets rise to the top.
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
            <div className={`value num ${totals.net >= 0 ? "good" : "bad"}`}>{fmtSigned(totals.net)}</div>
          </div>
        </section>

        <div className="board">
          <div className="panel" id="submit-idea">
            <h2>Submit an idea</h2>
            <p className="sub">Every field feeds the ledger — be realistic with the numbers.</p>
            <IdeaForm user={user} profile={profile} idPrefix="side" />
          </div>

          <div>
            <div className="list-head">
              <h2>The ledger</h2>
              <div className="sort-group" role="group" aria-label="Sort ideas">
                {(
                  [
                    ["net", "Net value"],
                    ["revenue", "Revenue"],
                    ["cost", "Cost"],
                    ["new", "Newest"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
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

            <div className="filter-bar" role="search">
              <div className="filter-search">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  aria-label="Search ideas"
                  placeholder="Search ideas, descriptions, people"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select aria-label="Filter by area" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                <option value="all">All areas</option>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by person"
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
              >
                <option value="all">Everyone</option>
                <option value="mine">Submitted by me</option>
                <option value="contact">I&apos;m a point of contact</option>
                {peopleOnIdeas.length > 0 && (
                  <optgroup label="Submitted by or contact">
                    {peopleOnIdeas.map((p) => (
                      <option key={p.uid} value={`user:${p.uid}`}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <select
                aria-label="Filter by net value"
                value={valueFilter}
                onChange={(e) => setValueFilter(e.target.value as ValueFilter)}
              >
                <option value="all">Any net value</option>
                <option value="profitable">Net positive</option>
                <option value="loss">Break-even or loss</option>
              </select>
            </div>

            {filtersActive && (
              <div className="filter-status">
                Showing {visible.length} of {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
                <button type="button" className="link-btn" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            )}

            <div className="ledger">
              <div className="lrow head">
                <div>Idea</div>
                <div>Area</div>
                <div style={{ textAlign: "right" }}>Cost</div>
                <div style={{ textAlign: "right" }}>Revenue</div>
                <div style={{ textAlign: "right" }}>Net</div>
                <div />
              </div>

              {visible.map((it, i) => {
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
                      <span className={`net-pill num ${n >= 0 ? "good" : "bad"}`}>{fmtSigned(n)}</span>
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

              {loaded && !ideas.length && (
                <div className="empty-note">No ideas yet — be the first to submit one on the left.</div>
              )}
              {ideas.length > 0 && !visible.length && (
                <div className="empty-note">
                  No ideas match these filters.{" "}
                  <button type="button" className="link-btn" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
