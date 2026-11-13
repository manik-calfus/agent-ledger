"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { initials, type Person } from "@/lib/useActiveUsers";

export default function ContributorPicker({
  id,
  people,
  value,
  onChange,
}: {
  id: string;
  people: Person[];
  value: Person[];
  onChange: (next: Person[]) => void;
}) {
  const [queryText, setQueryText] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUids = useMemo(() => new Set(value.map((p) => p.uid)), [value]);

  const matches = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return people
      .filter((p) => !selectedUids.has(p.uid))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [people, queryText, selectedUids]);

  function add(p: Person) {
    onChange([...value, p]);
    setQueryText("");
    setHighlight(0);
    inputRef.current?.focus();
  }

  function remove(uid: string) {
    onChange(value.filter((p) => p.uid !== uid));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[highlight]) {
        e.preventDefault();
        add(matches[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !queryText && value.length) {
      remove(value[value.length - 1].uid);
    }
  }

  return (
    <div className="picker">
      <div className="picker-box" onClick={() => inputRef.current?.focus()}>
        {value.map((p) => (
          <span className="chip" key={p.uid} title={p.email}>
            <span className="avatar sm">{initials(p.name || p.email)}</span>
            {p.name || p.email}
            <button
              type="button"
              className="chip-x"
              aria-label={`Remove ${p.name || p.email}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(p.uid);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          type="text"
          className="picker-input"
          placeholder={value.length ? "Add another…" : "Search people by name or email"}
          value={queryText}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={`${id}-list`}
          onChange={(e) => {
            setQueryText(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="picker-list" id={`${id}-list`} role="listbox">
          {matches.map((p, i) => (
            <li
              key={p.uid}
              role="option"
              aria-selected={i === highlight}
              className={`picker-option${i === highlight ? " hl" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                add(p);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              <span className="avatar sm">{initials(p.name || p.email)}</span>
              <span>
                <span className="picker-name">{p.name || p.email}</span>
                <span className="picker-email">{p.email}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
