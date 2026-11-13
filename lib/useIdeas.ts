"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Person } from "@/lib/useActiveUsers";

export type Idea = {
  id: string;
  title: string;
  link: string;
  desc: string;
  area: string;
  cost: number;
  revenue: number;
  createdAt: number;
  updatedAt: number;
  submittedByUid: string;
  submittedByName: string;
  submittedByEmail: string;
  contributors: Person[];
  contributorUids: string[];
};

export function net(it: Pick<Idea, "cost" | "revenue">): number {
  return (Number(it.revenue) || 0) - (Number(it.cost) || 0);
}

export function useIdeas(): { ideas: Idea[]; loaded: boolean } {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "ideas"), orderBy("createdAt", "desc"), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setIdeas(
          snap.docs.map((d) => {
            const data = d.data() as Partial<Idea>;
            const createdAt = Number(data.createdAt) || 0;
            return {
              id: d.id,
              title: data.title || "Untitled agent",
              link: data.link || "",
              desc: data.desc || "",
              area: data.area || "Other",
              cost: Number(data.cost) || 0,
              revenue: Number(data.revenue) || 0,
              createdAt,
              updatedAt: Number(data.updatedAt) || createdAt,
              submittedByUid: data.submittedByUid || "",
              submittedByName: data.submittedByName || "Someone",
              submittedByEmail: data.submittedByEmail || "",
              contributors: Array.isArray(data.contributors) ? data.contributors : [],
              contributorUids: Array.isArray(data.contributorUids) ? data.contributorUids : [],
            };
          })
        );
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return () => unsub();
  }, []);

  return { ideas, loaded };
}
