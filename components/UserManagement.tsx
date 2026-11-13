"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile, UserRole, UserStatus } from "@/lib/useAuth";
import AppHeader from "@/components/AppHeader";

type UserRow = UserProfile & { id: string };

const STATUS_ORDER: Record<UserStatus, number> = { pending: 0, active: 1, removed: 2 };

export default function UserManagement({
  currentUid,
  profile,
}: {
  currentUid: string;
  profile: UserProfile;
}) {
  const [rows, setRows] = useState<UserRow[]>([]);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserProfile) })));
    });
    return () => unsub();
  }, []);

  const sorted = useMemo(
    () => rows.slice().sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [rows]
  );

  async function setStatus(id: string, status: UserStatus) {
    if (!db) return;
    await updateDoc(doc(db, "users", id), { status, updatedAt: Date.now() });
  }

  async function setRole(id: string, role: UserRole) {
    if (!db) return;
    await updateDoc(doc(db, "users", id), { role, updatedAt: Date.now() });
  }

  return (
    <div className="wrap">
      <AppHeader profile={profile} backHref="/" />

      <header className="top">
        <div className="title-block">
          <div className="eyebrow">Admin</div>
          <h1>User management</h1>
          <p>
            Approve people after their first sign-in, promote admins, or remove someone&apos;s access.
            There&apos;s no way to invite someone before they&apos;ve signed in once — they show up here
            as &quot;Pending&quot; the moment they do.
          </p>
        </div>
      </header>

      <div className="admin-table">
        <div className="arow head">
          <div>Person</div>
          <div>Role</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {sorted.map((row) => {
          const isSelf = row.id === currentUid;
          return (
            <div className="arow" key={row.id}>
              <div>
                <div className="idea-title" style={{ fontSize: "14.5px" }}>
                  {row.name}
                </div>
                <div className="idea-meta">{row.email}</div>
              </div>
              <div>
                <span className={`pill ${row.role}`}>{row.role}</span>
              </div>
              <div>
                <span className={`pill ${row.status}`}>{row.status}</span>
              </div>
              <div className="admin-actions">
                {row.status === "pending" && (
                  <button type="button" className="btn-small" onClick={() => setStatus(row.id, "active")}>
                    Approve
                  </button>
                )}
                {row.status !== "pending" && row.role === "member" && (
                  <button type="button" className="btn-small" onClick={() => setRole(row.id, "admin")}>
                    Make admin
                  </button>
                )}
                {row.status !== "pending" && row.role === "admin" && !isSelf && (
                  <button type="button" className="btn-small" onClick={() => setRole(row.id, "member")}>
                    Revoke admin
                  </button>
                )}
                {row.status === "active" && !isSelf && (
                  <button
                    type="button"
                    className="btn-small danger"
                    onClick={() => setStatus(row.id, "removed")}
                  >
                    Remove access
                  </button>
                )}
                {row.status === "removed" && (
                  <button type="button" className="btn-small" onClick={() => setStatus(row.id, "active")}>
                    Restore access
                  </button>
                )}
                {isSelf && <span className="idea-meta">That&apos;s you</span>}
              </div>
            </div>
          );
        })}

        {!sorted.length && <div className="empty-note">No one has signed in yet.</div>}
      </div>
    </div>
  );
}
