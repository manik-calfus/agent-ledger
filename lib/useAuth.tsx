"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { ADMIN_EMAILS, auth, db, isFirebaseConfigured } from "@/lib/firebase";

export type UserStatus = "pending" | "active" | "removed";
export type UserRole = "admin" | "member";

export type UserProfile = {
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: number;
  updatedAt: number;
};

type AuthState = {
  loading: boolean;
  configured: boolean;
  user: User | null;
  profile: UserProfile | null;
};

const AuthContext = createContext<AuthState>({
  loading: true,
  configured: false,
  user: null,
  profile: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

async function ensureProfileDoc(user: User) {
  if (!db) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const email = (user.email || "").toLowerCase();
  const isPreApprovedAdmin = ADMIN_EMAILS.map((a) => a.toLowerCase()).includes(email);
  const now = Date.now();

  // Mirrors firestore.rules: a brand-new doc can only be self-created as a
  // pending member, except the hardcoded admin email(s), which self-activate.
  await setDoc(ref, {
    email,
    name: user.displayName || email || "Someone",
    role: isPreApprovedAdmin ? "admin" : "member",
    status: isPreApprovedAdmin ? "active" : "pending",
    createdAt: now,
    updatedAt: now,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    configured: isFirebaseConfigured,
    user: null,
    profile: null,
  });

  useEffect(() => {
    if (!auth || !db) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!user) {
        setState({ loading: false, configured: true, user: null, profile: null });
        return;
      }

      setState((s) => ({ ...s, loading: true, user }));

      try {
        await ensureProfileDoc(user);
      } catch {
        // If this fails (e.g. a rules edge case), the onSnapshot below still
        // reflects reality — surfaced to the user as "no profile yet".
      }

      const ref = doc(db!, "users", user.uid);
      unsubProfile = onSnapshot(
        ref,
        (snap) => {
          setState({
            loading: false,
            configured: true,
            user,
            profile: snap.exists() ? (snap.data() as UserProfile) : null,
          });
        },
        () => {
          setState({ loading: false, configured: true, user, profile: null });
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
