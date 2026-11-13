"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Person = { uid: string; name: string; email: string };
export type ActivePerson = Person & { notifyEmail: boolean };

export function useActiveUsers(): ActivePerson[] {
  const [people, setPeople] = useState<ActivePerson[]>([]);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "users"), where("status", "==", "active"));
    const unsub = onSnapshot(q, (snap) => {
      setPeople(
        snap.docs
          .map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              name: (data.name as string) || "",
              email: (data.email as string) || "",
              notifyEmail: data.notifyEmail !== false,
            };
          })
          .filter((p) => p.email)
          .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
      );
    });
    return () => unsub();
  }, []);

  return people;
}

export function initials(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[1][0] : "")).toUpperCase();
}
