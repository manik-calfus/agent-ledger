# Agent Ledger

A dashboard for pitching AI agent ideas: a link, a description, the target area, what it costs to
build, and what it could return. Submissions rank live by net value (revenue − cost).

Next.js 14 (App Router) + Firebase Firestore for the shared data, deployed on Vercel.

## 1. Create the Firebase project

1. [Firebase console](https://console.firebase.google.com) → **Add project**.
2. **Build → Firestore Database → Create database** (start in production mode).
3. **Project settings → Your apps → Add app → Web**, register it, copy the `firebaseConfig` values.
4. **Build → Authentication → Sign-in method → Anonymous → Enable** (used only to let each visitor
   delete their own submissions — no sign-up flow is shown to users).
5. Deploy the security rules in [`firestore.rules`](firestore.rules):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore   # point it at the existing project, keep the existing rules file
   firebase deploy --only firestore:rules
   ```

## 2. Local setup

```bash
cp .env.example .env.local   # fill in the Firebase config values from step 1.3
npm install
npm run dev
```

## 3. Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. [vercel.com/new](https://vercel.com/new) → import the `agent-ledger` repo.
3. Add the six `NEXT_PUBLIC_FIREBASE_*` variables from `.env.local` under **Environment Variables**.
4. Deploy. The Firebase config is safe to expose client-side — access is controlled by
   `firestore.rules`, not by hiding the config.

## Notes

- Without Firebase env vars set, the app still runs and shows three example rows, but the form
  won't save anything — it's a clearly offline preview.
- Security rules allow anyone to read and submit, and let a visitor delete only what they
  themselves submitted (tracked via anonymous auth, not a real account).
