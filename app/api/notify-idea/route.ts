import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Same project id as lib/firebase.ts — not a secret, so it's fine to repeat here.
const PROJECT_ID = "agent-ledger-5f6d7";
const MAX_RECIPIENTS = 200;

function adminApp() {
  return getApps().length ? getApps()[0] : initializeApp({ projectId: PROJECT_ID });
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

type IdeaPayload = {
  title?: string;
  desc?: string;
  area?: string;
  cost?: number;
  revenue?: number;
  link?: string;
  submittedByName?: string;
};

export async function POST(req: NextRequest) {
  let body: { idToken?: string; recipients?: unknown; idea?: IdeaPayload };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { idToken, recipients, idea } = body;
  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  // Verifying the Firebase ID token needs no secret — it checks the JWT
  // signature against Google's public keys, keyed only to the project id.
  // This just confirms the caller is a real signed-in user, not a bot.
  try {
    await getAuth(adminApp()).verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const toAddrs = Array.isArray(recipients)
    ? Array.from(
        new Set(recipients.filter((r): r is string => typeof r === "string" && r.includes("@")))
      ).slice(0, MAX_RECIPIENTS)
    : [];

  if (!toAddrs.length) {
    return NextResponse.json({ ok: true, skipped: "no_recipients" });
  }

  const tenantId = process.env.NOTIFY_AZURE_TENANT_ID;
  const clientId = process.env.NOTIFY_AZURE_CLIENT_ID;
  const clientSecret = process.env.NOTIFY_AZURE_CLIENT_SECRET;
  const sender = process.env.NOTIFY_AGENT_EMAIL;

  if (!tenantId || !clientId || !clientSecret || !sender) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    });
    const tokenJson: { access_token?: string } = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json({ error: "graph_auth_failed" }, { status: 502 });
    }

    const title = idea?.title || "A new agent idea";
    const area = idea?.area || "";
    const cost = Number(idea?.cost) || 0;
    const revenue = Number(idea?.revenue) || 0;
    const net = revenue - cost;
    const submitter = idea?.submittedByName || "Someone";
    const link = idea?.link || "";
    const desc = idea?.desc || "";

    const html = `
      <p><strong>${escapeHtml(submitter)}</strong> just added a new agent idea to the Agent Ledger.</p>
      <h3 style="margin-bottom:4px">${escapeHtml(title)}</h3>
      <p style="color:#5b5447">${escapeHtml(desc)}</p>
      <table cellpadding="4" style="border-collapse:collapse;margin:12px 0">
        <tr><td><strong>Area</strong></td><td>${escapeHtml(area)}</td></tr>
        <tr><td><strong>Cost to build</strong></td><td>$${cost.toLocaleString()}</td></tr>
        <tr><td><strong>Revenue potential</strong></td><td>$${revenue.toLocaleString()}</td></tr>
        <tr><td><strong>Net value</strong></td><td>${net >= 0 ? "+" : ""}$${net.toLocaleString()}</td></tr>
      </table>
      ${link ? `<p><a href="${escapeHtml(link)}">View the agent</a></p>` : ""}
    `;

    const sendRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: `New agent idea: ${title}`,
            body: { contentType: "HTML", content: html },
            toRecipients: toAddrs.map((a) => ({ emailAddress: { address: a } })),
          },
          saveToSentItems: false,
        }),
      }
    );

    if (!sendRes.ok) {
      const detail = await sendRes.text();
      return NextResponse.json({ error: "send_failed", detail }, { status: 502 });
    }

    return NextResponse.json({ ok: true, sent: toAddrs.length });
  } catch {
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
