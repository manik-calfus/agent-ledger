import { initializeApp, getApps, getApp, deleteApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

// Firebase's web config is not a secret — it identifies the project to the
// client SDK, and access is enforced by firestore.rules, not by hiding this.
const config: FirebaseOptions = {
  apiKey: "AIzaSyDAdv9IlhouLQ4cS7XpLjj53hUDLuLQ58k",
  authDomain: "agent-ledger-5f6d7.firebaseapp.com",
  projectId: "agent-ledger-5f6d7",
  storageBucket: "agent-ledger-5f6d7.firebasestorage.app",
  messagingSenderId: "446834486973",
  appId: "1:446834486973:web:f21f24d8d89ecfa12491d4",
};

// Mirrors isPreApprovedAdmin() in firestore.rules.
export const ADMIN_EMAILS = ["manik.anand@calfus.com"];

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null;

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

export async function signIn(email: string, password: string): Promise<User | null> {
  if (!auth) return null;
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signUp(name: string, email: string, password: string): Promise<User | null> {
  if (!auth) return null;
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name.trim() });
  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function resendVerification(): Promise<void> {
  if (auth?.currentUser) await sendEmailVerification(auth.currentUser);
}

export async function resetPassword(email: string): Promise<void> {
  if (!auth) return;
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

// Creating an account with the normal auth instance would sign the admin out
// and sign the new user in. A throwaway secondary app instance avoids that.
// The new person gets a password-reset email to set their own password.
export async function createAccountForSomeoneElse(email: string): Promise<string> {
  const secondary = initializeApp(config, `admin-create-${Date.now()}`);
  try {
    const secondaryAuth = getAuth(secondary);
    const tempPassword = crypto.getRandomValues(new Uint32Array(4)).join("-") + "Aa!";
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), tempPassword);
    await sendPasswordResetEmail(secondaryAuth, email.trim());
    await signOut(secondaryAuth);
    return cred.user.uid;
  } finally {
    await deleteApp(secondary);
  }
}
