"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API can be blocked (e.g. non-secure contexts); fall back.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

type Target = { key: string; label: string; icon: ReactNode };

const TARGETS: Target[] = [
  {
    key: "slack",
    label: "Slack",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="9.5" y="2" width="3" height="8" rx="1.5" fill="#36C5F0" />
        <rect x="2" y="11.5" width="8" height="3" rx="1.5" fill="#E01E5A" />
        <rect x="11.5" y="14" width="3" height="8" rx="1.5" fill="#ECB22E" />
        <rect x="14" y="9.5" width="8" height="3" rx="1.5" fill="#2EB67D" />
      </svg>
    ),
  },
  {
    key: "teams",
    label: "Teams",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="2" y="4" width="15" height="16" rx="3" fill="#5059C9" />
        <path d="M6 9h7M9.5 9v7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="19" cy="7" r="3" fill="#7B83EB" />
      </svg>
    ),
  },
  {
    key: "email",
    label: "Email",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="#6B6253" />
        <path d="M3.5 7l8.5 6 8.5-6" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#25D366" />
        <path
          d="M8.6 7.6c.3-.3.8-.3 1 .1l.9 1.7c.1.3.1.6-.1.8l-.6.6c.5 1.1 1.4 2 2.5 2.5l.6-.6c.2-.2.5-.3.8-.1l1.7.9c.4.2.4.7.1 1l-.8.8c-.5.5-1.2.6-1.8.4-2.4-.9-4.3-2.8-5.2-5.2-.2-.6-.1-1.3.4-1.8z"
          fill="#fff"
        />
      </svg>
    ),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" />
        <rect x="6" y="10" width="2.6" height="8" fill="#fff" />
        <circle cx="7.3" cy="7" r="1.5" fill="#fff" />
        <path d="M11 10h2.5v1.2c.5-.8 1.4-1.4 2.6-1.4 2 0 2.9 1.2 2.9 3.4V18h-2.6v-4.3c0-1-.4-1.6-1.3-1.6s-1.5.6-1.5 1.6V18H11z" fill="#fff" />
      </svg>
    ),
  },
];

export default function ShareModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("Hey check this out");
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    dialogRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  async function handleCopy(kind: "link" | "message") {
    const text = kind === "link" ? url : `${message.trim()} — ${title}\n${url}`;
    const ok = await copyText(text);
    if (ok) {
      setCopied(kind);
      setNotice(null);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1800);
    } else {
      setNotice("Couldn't copy automatically — select the link and copy it manually.");
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="modal-head">
          <h2 id="share-title">Share this idea</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="share-targets">
          {TARGETS.map((t) => (
            <button
              key={t.key}
              type="button"
              className="share-target"
              onClick={() => setNotice(`${t.label} sharing is coming soon — use Copy message for now.`)}
            >
              <span className="share-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="share-message">Message</label>
          <textarea
            id="share-message"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="share-preview">
            {message.trim()} — {title}
            <br />
            <span className="share-preview-url">{url}</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="share-url">Link</label>
          <div className="copy-row">
            <input
              id="share-url"
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className="btn-small" onClick={() => handleCopy("link")}>
              {copied === "link" ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>

        {notice && <div className="hint">{notice}</div>}

        <div className="modal-actions">
          <button type="button" className="submit-btn secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="submit-btn" onClick={() => handleCopy("message")}>
            {copied === "message" ? "Copied to clipboard" : "Copy message"}
          </button>
        </div>
      </div>
    </div>
  );
}
