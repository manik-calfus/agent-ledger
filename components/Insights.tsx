"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { fmt, fmtSigned } from "@/lib/format";
import type { UserProfile } from "@/lib/useAuth";
import { net, useIdeas, type Idea } from "@/lib/useIdeas";
import AppHeader from "@/components/AppHeader";

type Tip = { x: number; y: number; flip: boolean; content: ReactNode } | null;

// Bar with only its far end rounded (data-end), anchored flat at the baseline.
function hBar(x0: number, x1: number, y: number, h: number, r = 4): string {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const w = right - left;
  if (w < 0.5) return "";
  const rr = Math.min(r, w, h / 2);
  if (x1 >= x0) {
    return `M${left},${y} H${right - rr} Q${right},${y} ${right},${y + rr} V${y + h - rr} Q${right},${y + h} ${right - rr},${y + h} H${left} Z`;
  }
  return `M${right},${y} H${left + rr} Q${left},${y} ${left},${y + rr} V${y + h - rr} Q${left},${y + h} ${left + rr},${y + h} H${right} Z`;
}

function vBar(x: number, w: number, yTop: number, yBase: number, r = 4): string {
  const h = yBase - yTop;
  if (h < 0.5) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${yBase} V${yTop + rr} Q${x},${yTop} ${x + rr},${yTop} H${x + w - rr} Q${x + w},${yTop} ${x + w},${yTop + rr} V${yBase} Z`;
}

// Tracks the chart container's real width so the SVG renders 1:1 with CSS
// pixels — a fixed viewBox would scale text up or down with the card.
function useChartBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  function show(e: MouseEvent, content: ReactNode) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const x = e.clientX - box.left;
    setTip({ x, y: e.clientY - box.top, flip: x > box.width * 0.6, content });
  }
  return { ref, tip, width, show, hide: () => setTip(null) };
}

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div className={`chart-tip${tip.flip ? " flip" : ""}`} style={{ left: tip.x, top: tip.y }} role="status">
      {tip.content}
    </div>
  );
}

type AreaRow = { area: string; count: number; cost: number; revenue: number; net: number };

function NetByArea({ rows }: { rows: AreaRow[] }) {
  const { ref, tip, width: W, show, hide } = useChartBox();
  const labelW = 112;
  const valuePad = 64;
  const rowH = 34;
  const barH = 18;
  const H = rows.length * rowH + 8;

  const maxPos = Math.max(0, ...rows.map((r) => r.net));
  const minNeg = Math.min(0, ...rows.map((r) => r.net));
  const span = maxPos - minNeg || 1;
  const plotL = labelW + (minNeg < 0 ? valuePad : 0);
  const plotR = W - valuePad;
  const x = (v: number) => plotL + ((v - minNeg) / span) * (plotR - plotL);
  const zero = x(0);

  return (
    <div className="chart-box" ref={ref} onMouseLeave={hide}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Net value by area">
        <line x1={zero} x2={zero} y1={0} y2={H} className="chart-zero" />
        {rows.map((r, i) => {
          const y = i * rowH + (rowH - barH) / 2;
          const end = x(r.net);
          const pos = r.net >= 0;
          return (
            <g
              key={r.area}
              onMouseMove={(e) =>
                show(
                  e,
                  <>
                    <strong>{r.area}</strong>
                    <span>
                      {r.count} {r.count === 1 ? "idea" : "ideas"}
                    </span>
                    <span>
                      {fmt(r.cost)} cost → {fmt(r.revenue)} revenue
                    </span>
                    <span className="num">Net {fmtSigned(r.net)}</span>
                  </>
                )
              }
            >
              <rect x={0} y={i * rowH} width={W} height={rowH} className="chart-hit" />
              <text x={labelW - 12} y={y + barH / 2} className="chart-label" textAnchor="end" dominantBaseline="middle">
                {r.area}
              </text>
              <path d={hBar(zero, end, y, barH)} className={pos ? "chart-pos" : "chart-neg"} />
              <text
                x={pos ? end + 8 : end - 8}
                y={y + barH / 2}
                className="chart-value num"
                textAnchor={pos ? "start" : "end"}
                dominantBaseline="middle"
              >
                {fmtSigned(r.net)}
              </text>
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

type MonthRow = { key: string; label: string; count: number; net: number };

function IdeasPerMonth({ rows }: { rows: MonthRow[] }) {
  const { ref, tip, width: W, show, hide } = useChartBox();
  const H = 220;
  const padL = 32;
  const padR = 8;
  const padT = 20;
  const padB = 28;
  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const step = maxCount <= 4 ? 1 : Math.ceil(maxCount / 4);
  const top = Math.ceil(maxCount / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const slot = (W - padL - padR) / rows.length;
  const barW = Math.min(44, slot * 0.56);

  return (
    <div className="chart-box" ref={ref} onMouseLeave={hide}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Ideas submitted per month">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className={t === 0 ? "chart-zero" : "chart-grid"} />
            <text x={padL - 8} y={y(t)} className="chart-axis num" textAnchor="end" dominantBaseline="middle">
              {t}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cx = padL + slot * i + slot / 2;
          return (
            <g
              key={r.key}
              onMouseMove={(e) =>
                show(
                  e,
                  <>
                    <strong>{r.label}</strong>
                    <span>
                      {r.count} {r.count === 1 ? "idea" : "ideas"} submitted
                    </span>
                    {r.count > 0 && <span className="num">Net {fmtSigned(r.net)}</span>}
                  </>
                )
              }
            >
              <rect x={cx - slot / 2} y={0} width={slot} height={H} className="chart-hit" />
              <path d={vBar(cx - barW / 2, barW, y(r.count), y(0))} className="chart-pos" />
              {r.count > 0 && (
                <text x={cx} y={y(r.count) - 7} className="chart-value num" textAnchor="middle">
                  {r.count}
                </text>
              )}
              <text x={cx} y={H - 8} className="chart-axis" textAnchor="middle">
                {r.label.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

function monthKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonths(ideas: Idea[]): MonthRow[] {
  const now = new Date();
  const rows: MonthRow[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    rows.push({
      key: monthKey(d.getTime()),
      label: d.toLocaleString(undefined, { month: "short", year: "numeric" }),
      count: 0,
      net: 0,
    });
  }
  const byKey = new Map(rows.map((r) => [r.key, r]));
  for (const it of ideas) {
    const row = byKey.get(monthKey(it.createdAt));
    if (row) {
      row.count += 1;
      row.net += net(it);
    }
  }
  return rows;
}

export default function Insights({ profile }: { profile: UserProfile }) {
  const { ideas, loaded } = useIdeas();

  const data = useMemo(() => {
    const cost = ideas.reduce((s, it) => s + it.cost, 0);
    const revenue = ideas.reduce((s, it) => s + it.revenue, 0);
    const positive = ideas.filter((it) => net(it) > 0).length;

    const areaMap = new Map<string, AreaRow>();
    for (const it of ideas) {
      const row = areaMap.get(it.area) || { area: it.area, count: 0, cost: 0, revenue: 0, net: 0 };
      row.count += 1;
      row.cost += it.cost;
      row.revenue += it.revenue;
      row.net += net(it);
      areaMap.set(it.area, row);
    }
    const areas = Array.from(areaMap.values()).sort((a, b) => b.net - a.net);

    const people = new Map<string, { name: string; count: number; net: number }>();
    for (const it of ideas) {
      const p = people.get(it.submittedByUid) || { name: it.submittedByName, count: 0, net: 0 };
      p.count += 1;
      p.net += net(it);
      people.set(it.submittedByUid, p);
    }
    const contributors = Array.from(people.values())
      .sort((a, b) => b.count - a.count || b.net - a.net)
      .slice(0, 5);

    const bets = ideas
      .slice()
      .sort((a, b) => net(b) - net(a))
      .slice(0, 3);

    return {
      count: ideas.length,
      net: revenue - cost,
      multiple: cost > 0 ? revenue / cost : null,
      positiveShare: ideas.length ? Math.round((positive / ideas.length) * 100) : 0,
      areas,
      months: buildMonths(ideas),
      contributors,
      bets,
    };
  }, [ideas]);

  return (
    <>
      <AppHeader profile={profile} />
      <div className="wrap">
        <header className="top">
          <div className="title-block">
            <div className="eyebrow">Portfolio</div>
            <h1>Insights</h1>
            <p>Where the ledger&apos;s value is concentrated, and how fast new ideas are coming in.</p>
          </div>
        </header>

        <section className="stats" aria-label="Portfolio summary">
          <div className="stat">
            <div className="label">Ideas logged</div>
            <div className="value num">{data.count}</div>
          </div>
          <div className="stat">
            <div className="label">Net projected value</div>
            <div className={`value num ${data.net >= 0 ? "good" : "bad"}`}>{fmtSigned(data.net)}</div>
          </div>
          <div className="stat">
            <div className="label">Portfolio return</div>
            <div className="value num">{data.multiple === null ? "—" : `${data.multiple.toFixed(1)}×`}</div>
          </div>
          <div className="stat">
            <div className="label">Ideas that pay back</div>
            <div className="value num">{data.positiveShare}%</div>
          </div>
        </section>

        {loaded && data.count === 0 ? (
          <p className="empty-inline">Insights appear once the first ideas are on the ledger.</p>
        ) : (
          <div className="insights-grid">
            <section className="insight-card wide">
              <div className="insight-head">
                <h2>Net value by area</h2>
                <span className="insight-sub">Revenue minus build cost, summed per targeted area</span>
              </div>
              <NetByArea rows={data.areas} />
              <details className="chart-table">
                <summary>Show as table</summary>
                <table>
                  <thead>
                    <tr>
                      <th>Area</th>
                      <th>Ideas</th>
                      <th>Cost</th>
                      <th>Revenue</th>
                      <th>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.areas.map((r) => (
                      <tr key={r.area}>
                        <td>{r.area}</td>
                        <td className="num">{r.count}</td>
                        <td className="num">{fmt(r.cost)}</td>
                        <td className="num">{fmt(r.revenue)}</td>
                        <td className="num">{fmtSigned(r.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>

            <section className="insight-card">
              <div className="insight-head">
                <h2>Ideas per month</h2>
                <span className="insight-sub">Last six months</span>
              </div>
              <IdeasPerMonth rows={data.months} />
              <details className="chart-table">
                <summary>Show as table</summary>
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Ideas</th>
                      <th>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.months.map((r) => (
                      <tr key={r.key}>
                        <td>{r.label}</td>
                        <td className="num">{r.count}</td>
                        <td className="num">{r.count ? fmtSigned(r.net) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>

            <section className="insight-card">
              <div className="insight-head">
                <h2>Top contributors</h2>
                <span className="insight-sub">By ideas submitted</span>
              </div>
              <ol className="rank-list">
                {data.contributors.map((p, i) => (
                  <li key={p.name + i}>
                    <span className="rank">{i + 1}</span>
                    <span className="rank-name">{p.name}</span>
                    <span className="rank-count num">
                      {p.count} {p.count === 1 ? "idea" : "ideas"}
                    </span>
                    <span className={`net-pill num ${p.net >= 0 ? "good" : "bad"}`}>{fmtSigned(p.net)}</span>
                  </li>
                ))}
              </ol>

              <div className="insight-head" style={{ marginTop: 24 }}>
                <h2>Biggest bets</h2>
                <span className="insight-sub">Highest net value</span>
              </div>
              <ol className="rank-list">
                {data.bets.map((it, i) => (
                  <li key={it.id}>
                    <span className="rank">{i + 1}</span>
                    <Link href={`/ideas/${it.id}`} className="rank-name rank-link">
                      {it.title}
                    </Link>
                    <span className="rank-count">{it.area}</span>
                    <span className={`net-pill num ${net(it) >= 0 ? "good" : "bad"}`}>{fmtSigned(net(it))}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
