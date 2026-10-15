import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

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

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null;

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

export async function ensureSignedIn(): Promise<string | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}
