"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Private per-person state (rules: only you can read/write your own doc).
export function useUserState(uid: string | undefined) {
  const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!db || !uid) return;
    const unsub = onSnapshot(
      doc(db, "userState", uid),
      (snap) => {
        setLastSeenAt(snap.exists() ? Number(snap.data().notificationsSeenAt) || 0 : 0);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return () => unsub();
  }, [uid]);

  const markSeen = useCallback(async () => {
    if (!db || !uid) return;
    await setDoc(doc(db, "userState", uid), { notificationsSeenAt: Date.now() }, { merge: true });
  }, [uid]);

  return { lastSeenAt: lastSeenAt ?? 0, loaded, markSeen };
}
