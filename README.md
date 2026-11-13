# Agent Ledger

A dashboard for pitching AI agent ideas: a link, a description, the target area, what it costs to
build, and what it could return. Submissions rank live by net value (revenue − cost).

Next.js 14 (App Router) + Firebase Firestore (data) + Firebase Auth email/password (login),
deployed on Vercel.

## What's in this version

- **Login**: email + password, with "create account" and "forgot password". Self sign-ups must
  verify their email before anything else happens.
- **User directory**: a `users/{uid}` Firestore doc per person (`email`, `name`, `role`,
  `status`). The pre-approved admin email self-activates as admin on first (verified) sign-in;
  other self sign-ups land as `status: "pending"` until an admin approves them.
- **User management** (`/admin/users`, admin-only):
  - **Add a user** directly as a member or admin — creates their account and emails them a link
    to set their own password. They're active immediately.
  - Approve pending self sign-ups, promote/revoke admin, remove/restore access.
- **Attribution**: every idea stores the submitter's name, email and uid, shown in the ledger and
  on the detail page.
- **Idea detail page**: clicking an idea opens `/ideas/[id]`; the external link is a separate
  button there.
- **Email notifications**: every new idea emails all `status: "active"` users, sent server-side
  from `app/api/notify-idea/route.ts` via Microsoft Graph (app-only / client-credentials), ported
  from the `communication-tools` repo's `send_email.py`.

## 1. Firebase setup

1. **Firebase console → Authentication → Sign-in method → Email/Password → Enable** (leave
   "Email link" off). Without this, sign-in shows "Email sign-in isn't switched on".
2. Deploy the security rules:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```
   (`firebase.json` / `.firebaserc` already point at the `agent-ledger-5f6d7` project.)

Verification and password-reset emails come from Firebase's built-in sender
(`noreply@agent-ledger-5f6d7.firebaseapp.com`) — they can land in spam the first time.

## 2. Pre-approved admin

`lib/firebase.ts`'s `ADMIN_EMAILS` and `isPreApprovedAdmin` in `firestore.rules` both list
`manik.anand@calfus.com`. That account self-activates as admin once its email is verified;
afterwards, add more admins from `/admin/users`. The rules require a verified email for this, so
nobody can register that address first and claim admin.

## 3. Email notification credentials

These are real secrets (a Microsoft Graph app-only client secret that can send mail as the sender
mailbox), so they're **not** in the repo — unlike the Firebase web config, which isn't a secret.
They're server-only env vars (no `NEXT_PUBLIC_` prefix, never sent to the browser):

```
NOTIFY_AZURE_TENANT_ID
NOTIFY_AZURE_CLIENT_ID
NOTIFY_AZURE_CLIENT_SECRET
NOTIFY_AGENT_EMAIL       # the mailbox notifications are sent from
```

Local dev reads them from `.env.local` (git-ignored). On Vercel they're set under
**Project Settings → Environment Variables**. Without them, submissions still work — only the
notification email is skipped.

**If notification emails aren't arriving:**

1. Open `https://<your-deployment>/api/notify-idea` in a browser. It returns
   `{"configured": true}` or lists the missing variable *names* (never values).
2. Env vars only apply to deployments made after they're added — redeploy after adding them.
3. After submitting an idea, the form says how many people were emailed, or why it failed.
4. Vercel → your project → **Logs**, filter for `notify-idea` — every failure logs its reason.
5. Check spam: mail comes from `NOTIFY_AGENT_EMAIL`, which external inboxes (e.g. Gmail) may
   not trust yet.
6. People can switch emails off in **Settings**; they're skipped as recipients.

## 4. Local setup

```bash
npm install
npm run dev
```

## 5. Deploy to Vercel

Import `agent-ledger` at [vercel.com/new](https://vercel.com/new), make sure the 4 env vars from
step 3 are set, deploy.

## Notes / tradeoffs

- "Add a user" creates the account from the admin's browser using a throwaway secondary Firebase
  app instance (so the admin stays signed in), with a random password the new user never sees —
  they set their own via the reset link.
- The notify endpoint checks the caller has a valid Firebase ID token (a JWT signature check, no
  secret needed) but trusts the recipient list the client sends, which the client builds from the
  `users` collection it reads under Firestore rules. Fine for an internal tool; tighten it if it
  ever needs to resist a malicious signed-in user.
