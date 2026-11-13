"use client";

import { useEffect, useRef } from "react";
import type { User } from "firebase/auth";
import type { UserProfile } from "@/lib/useAuth";
import IdeaForm, { type SubmitResult } from "@/components/IdeaForm";

export default function NewIdeaModal({
  user,
  profile,
  onClose,
  onSubmitted,
}: {
  user: User;
  profile: UserProfile;
  onClose: () => void;
  onSubmitted: (result: SubmitResult) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-idea-title"
        ref={dialogRef}
      >
        <div className="modal-head">
          <h2 id="new-idea-title">Submit an idea</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <IdeaForm user={user} profile={profile} idPrefix="modal" onSubmitted={onSubmitted} />
      </div>
    </div>
  );
}
