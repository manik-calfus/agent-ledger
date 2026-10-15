# Agent Ledger

A dashboard for pitching AI agent ideas: a link, a description, the target area, what it costs to
build, and what it could return. Submissions rank live by net value (revenue − cost).

Next.js 14 (App Router) + Firebase Firestore for the shared data, deployed on Vercel.

The Firebase web config lives directly in [`lib/firebase.ts`](lib/firebase.ts) rather than env
vars — it's safe to commit (access is enforced by `firestore.rules`, not by hiding this config),
and it means local dev, GitHub, and Vercel all run off the same file with zero environment-variable
setup.

## 1. Create the Firebase project

1. [Firebase console](https://console.firebase.google.com) → **Add project**.
2. **Build → Firestore Database → Create database** (start in production mode).
3. **Project settings → Your apps → Add app → Web**, register it, copy the `firebaseConfig` values
   into `lib/firebase.ts`.
4. **Build → Authentication → Sign-in method → Anonymous → Enable** (used only to let each visitor
   delete their own submissions — no sign-up flow is shown to users).
5. Deploy the security rules in [`firestore.rules`](firestore.rules):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```
   (`firebase.json` / `.firebaserc` already point at the project, so no `firebase init` needed.)

## 2. Local setup

```bash
npm install
npm run dev
```

## 3. Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. [vercel.com/new](https://vercel.com/new) → import the `agent-ledger` repo → Deploy. No
   environment variables needed.

## Notes

- If the Firestore rules above haven't been deployed yet, the app still runs and shows three
  example rows, but reads/writes fail with `permission-denied` and it shows "Offline" — that's
  expected until `firebase deploy --only firestore:rules` has run.
- Security rules allow anyone to read and submit, and let a visitor delete only what they
  themselves submitted (tracked via anonymous auth, not a real account).
