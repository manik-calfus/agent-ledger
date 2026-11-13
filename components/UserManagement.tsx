"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { createAccountForSomeoneElse, db } from "@/lib/firebase";
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
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("member");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<{ text: string; err: boolean } | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!db) return;
    setAdding(true);
    setAddMsg(null);
    const email = newEmail.trim().toLowerCase();
    try {
      const uid = await createAccountForSomeoneElse(email);
      const now = Date.now();
      await setDoc(doc(db, "users", uid), {
        email,
        name: newName.trim() || email,
        role: newRole,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      setAddMsg({
        text: `Added ${email} as ${newRole === "admin" ? "an admin" : "a member"}. They've been emailed a link to set their password.`,
        err: false,
      });
      setNewName("");
      setNewEmail("");
      setNewRole("member");
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      setAddMsg({
        text:
          code === "auth/email-already-in-use"
            ? "That email already has an account — find them in the list below to approve or promote them."
            : code === "auth/invalid-email"
              ? "That doesn't look like a valid email address."
              : "Couldn't add that user — try again.",
        err: true,
      });
    } finally {
      setAdding(false);
    }
  }

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
            Add people directly as members or admins, approve anyone who signed up on their own,
            promote admins, or remove someone&apos;s access.
          </p>
        </div>
      </header>

      <form className="panel add-user" onSubmit={handleAdd}>
        <h2>Add a user</h2>
        <p className="sub">They&apos;ll get an email with a link to set their own password.</p>
        <div className="add-user-grid">
          <div className="field">
            <label htmlFor="u-name">Full name</label>
            <input id="u-name" type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="u-email">Email</label>
            <input id="u-email" type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="u-role">Role</label>
            <select id="u-role" value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field add-user-submit">
            <button type="submit" className="submit-btn" disabled={adding}>
              {adding ? "Adding…" : "Add user"}
            </button>
          </div>
        </div>
        {addMsg && <div className={`hint${addMsg.err ? " err" : ""}`}>{addMsg.text}</div>}
      </form>

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
