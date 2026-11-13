"use client";

import { signOutUser } from "@/lib/firebase";
import type { UserStatus } from "@/lib/useAuth";

export default function StatusScreen({
  status,
  email,
}: {
  status: UserStatus | "no-profile";
  email: string | null;
}) {
  const copy =
    status === "pending"
      ? {
          title: "Your access is pending",
          body: "An admin needs to approve your account before you can see the ledger. Ask them to check the User management tab.",
        }
      : status === "removed"
        ? {
            title: "Access removed",
            body: "An admin has removed your access to the ledger. Reach out to them if this is unexpected.",
          }
        : {
            title: "Couldn't load your account",
            body: "Something went wrong setting up your profile. Try signing in again, or tell an admin if it keeps happening.",
          };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="eyebrow">Agent Ledger</div>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        {email && <p className="hint">Signed in as {email}</p>}
        <button type="button" className="submit-btn secondary" onClick={() => signOutUser()}>
          Sign out
        </button>
      </div>
    </div>
  );
}
