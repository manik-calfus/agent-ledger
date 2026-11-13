"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  emailVerified: boolean;
  profile: UserProfile | null;
};

type AuthContextValue = AuthState & { refresh: () => Promise<void> };

const AuthContext = createContext<AuthContextValue>({
  loading: true,
  configured: false,
  user: null,
  emailVerified: false,
  profile: null,
  refresh: async () => {},
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

  // Mirrors firestore.rules: self-created docs start pending, except the
  // hardcoded admin email(s), which self-activate.
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
    emailVerified: false,
    profile: null,
  });
  const unsubProfile = useRef<(() => void) | null>(null);

  const load = useCallback(async (user: User | null) => {
    if (unsubProfile.current) {
      unsubProfile.current();
      unsubProfile.current = null;
    }

    if (!user || !db) {
      setState({ loading: false, configured: isFirebaseConfigured, user: null, emailVerified: false, profile: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, user }));

    const ref = doc(db, "users", user.uid);

    // An admin-created account already has a profile doc; it shouldn't be
    // blocked on verification (the password-reset link they used proves the inbox).
    let existing = false;
    try {
      existing = (await getDoc(ref)).exists();
    } catch {
      existing = false;
    }

    if (!existing && !user.emailVerified) {
      setState({ loading: false, configured: true, user, emailVerified: false, profile: null });
      return;
    }

    if (!existing) {
      try {
        await ensureProfileDoc(user);
      } catch {
        // Surfaces below as "no profile".
      }
    }

    unsubProfile.current = onSnapshot(
      ref,
      (snap) =>
        setState({
          loading: false,
          configured: true,
          user,
          emailVerified: true,
          profile: snap.exists() ? (snap.data() as UserProfile) : null,
        }),
      () => setState({ loading: false, configured: true, user, emailVerified: true, profile: null })
    );
  }, []);

  const refresh = useCallback(async () => {
    const current = auth?.currentUser;
    if (!current) return;
    await current.reload();
    // Picks up the email_verified claim firestore.rules checks.
    await current.getIdToken(true);
    await load(auth!.currentUser);
  }, [load]);

  useEffect(() => {
    if (!auth || !db) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      void load(user);
    });
    return () => {
      unsubAuth();
      if (unsubProfile.current) unsubProfile.current();
    };
  }, [load]);

  return <AuthContext.Provider value={{ ...state, refresh }}>{children}</AuthContext.Provider>;
}
