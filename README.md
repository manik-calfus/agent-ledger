# Agent Ledger

A dashboard for pitching AI agent ideas: a link, a description, the target area, what it costs to
build, and what it could return. Submissions rank live by net value (revenue − cost).

Next.js 14 (App Router) + Firebase Firestore (data) + Firebase Auth with Microsoft SSO (login),
deployed on Vercel.

## What's in this version

- **Login**: Microsoft sign-in (`firestore.rules` + `lib/firebase.ts` restrict it to the
  `calfus.com` tenant). No anonymous access — every page requires sign-in.
- **User directory**: a `users/{uid}` Firestore doc per person (`email`, `name`, `role`,
  `status`). The very first sign-in from a hardcoded admin email self-activates as admin;
  everyone else lands as `status: "pending"` until an admin approves them.
- **Attribution**: every submitted idea stores the submitter's name, email and uid directly, so
  anyone can see who suggested it.
- **Idea detail page**: clicking an idea opens `/ideas/[id]` instead of jumping straight to the
  external link — the external link is now a clearly separate button on that page.
- **User management** (`/admin/users`, admin-only): approve pending sign-ins, promote/revoke
  admin, remove or restore someone's access.
- **Email notifications**: every new idea emails all `status: "active"` users, sent server-side
  from `app/api/notify-idea/route.ts` via Microsoft Graph (app-only / client-credentials), ported
  from the `communication-tools` repo's `send_email.py`.

## Important constraint on "adding" users

There's no way to pre-create an account for someone before they've signed in once — Firebase
doesn't let you mint a `users/{uid}` doc without a uid, and a uid only exists after that person's
first Microsoft sign-in. So "adding a user" in practice means: they sign in once, show up in
`/admin/users` as **Pending**, and an admin clicks **Approve**. "Removing" a user sets their
status to `removed` (revokes access immediately) rather than deleting their history.

## 1. Microsoft sign-in setup (Azure AD + Firebase) — needs your own Azure Portal access

This part can't be done from here — it needs an Azure AD admin in your tenant.

1. **Azure Portal → Microsoft Entra ID → App registrations → New registration.**
   - Name: anything, e.g. "Agent Ledger sign-in".
   - Supported account types: **Accounts in this organizational directory only** (single tenant).
   - Redirect URI: leave blank for now — Firebase gives you the exact value in step 2.
2. Under that app's **Certificates & secrets**, create a new client secret. Copy its value
   immediately (shown once).
3. Note the app's **Application (client) ID** from its Overview page.
4. **Firebase console → Authentication → Sign-in method → Add new provider → Microsoft.**
   - Paste the Application (client) ID and the client secret from steps 2–3.
   - Firebase shows a callback URL (`https://agent-ledger-5f6d7.firebaseapp.com/__/auth/handler`)
     — copy it.
5. Back in Azure, add that callback URL as a **Redirect URI** (type: Web) on the app registration,
   then save.
6. Under **API permissions** on the app registration, the default `User.Read` (delegated,
   Microsoft Graph) is enough — no admin consent needed for that one.

No client ID or secret from this app registration goes into this codebase — they live entirely in
the Firebase console. The code only hardcodes the tenant domain (`calfus.com`) to restrict who can
sign in, which isn't a secret.

## 2. Pre-approved admin

`lib/firebase.ts`'s `ADMIN_EMAILS` and the matching list in `firestore.rules`
(`isPreApprovedAdmin`) both currently list `manik.anand@calfus.com`. That person self-activates as
admin on their first sign-in; everyone else starts `pending`. To change or add admins later, just
sign in and use `/admin/users` — the hardcoded list only matters for bootstrapping the very first
admin.

## 3. Firestore setup

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

(`firebase.json` / `.firebaserc` already point at the `agent-ledger-5f6d7` project.)

## 4. Email notification credentials

These are real secrets (a Microsoft Graph app-only client secret that can send mail as the sender
mailbox) — **not** hardcoded in the repo, unlike the Firebase web config. They're read from
environment variables that only exist server-side (no `NEXT_PUBLIC_` prefix, so they're never
sent to the browser):

```
NOTIFY_AZURE_TENANT_ID=...
NOTIFY_AZURE_CLIENT_ID=...
NOTIFY_AZURE_CLIENT_SECRET=...
NOTIFY_AGENT_EMAIL=...     # the mailbox notifications are sent from
```

Local dev: already in `.env.local` (git-ignored, copied from the `communication-tools` repo's own
`.env`). On Vercel: **Project Settings → Environment Variables** → add the same four, for
Production (and Preview if you want notifications to fire there too) → redeploy.

Without these set, idea submissions still work — the notification call just fails silently
(logged server-side, not surfaced to the submitter).

## 5. Local setup

```bash
npm install
npm run dev
```

## 6. Deploy to Vercel

1. Push to GitHub (already done if you're reading this from the repo).
2. [vercel.com/new](https://vercel.com/new) → import `agent-ledger` → add the 4 env vars from
   step 4 → Deploy.

## Notes / tradeoffs

- The notify endpoint (`/api/notify-idea`) checks that the caller has a valid Firebase ID token
  (no secret needed for that — it's a JWT signature check against Google's public keys), but
  otherwise trusts the recipient list the client sends (which the client built from the real
  `users` collection it just read under Firestore rules). That's intentionally lightweight for an
  internal tool — tighten it if this ever needs to resist a malicious signed-in user, not just
  keep out bots.
- Security rules allow anyone **active** to read the ledger and the user directory, create ideas,
  and delete their own; admins can delete anyone's and manage all user docs.
