import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, OAuthProvider, signInWithPopup, signOut, type User } from "firebase/auth";

// Firebase's web config is not a secret — it identifies the project to the
// client SDK, and access is enforced by firestore.rules, not by hiding this.
// Hardcoded here (instead of env vars) so it works the same in local dev and
// on Vercel with zero environment-variable setup.
const config: FirebaseOptions = {
  apiKey: "AIzaSyDAdv9IlhouLQ4cS7XpLjj53hUDLuLQ58k",
  authDomain: "agent-ledger-5f6d7.firebaseapp.com",
  projectId: "agent-ledger-5f6d7",
  storageBucket: "agent-ledger-5f6d7.firebasestorage.app",
  messagingSenderId: "446834486973",
  appId: "1:446834486973:web:f21f24d8d89ecfa12491d4",
};

// The tenant domain Microsoft sign-in is restricted to. Not a secret — just
// the org's domain — so it's fine to hardcode alongside the rest of this
// config. Mirrors the admin allowlist enforced in firestore.rules.
export const ORG_DOMAIN = "calfus.com";
export const ADMIN_EMAILS = ["manik.anand@calfus.com"];

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null;

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

export async function signInWithMicrosoft(): Promise<User | null> {
  if (!auth) return null;
  const provider = new OAuthProvider("microsoft.com");
  // Restricts the Microsoft login screen to the org's own tenant — a
  // personal Microsoft account, or another company's tenant, can't sign in.
  provider.setCustomParameters({ tenant: ORG_DOMAIN, prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}
