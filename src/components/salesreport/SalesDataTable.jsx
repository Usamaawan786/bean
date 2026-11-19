import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Inbox } from "lucide-react";
import "./salesTable.css";
import { fmtPKR, lineTotal, methodKey, parseUtcMs, saleTimePkt } from "@/lib/salesReportUtils";

const PER_PAGE = 8;
const METHOD_RANK = { cash: 0, card: 1, mobilepayment: 2, complimentary: 3, foodpanda: 4 };
const SHORT_LABEL = { "Mobile Payment": "Mobile", Complimentary: "Comp" };
const PILL_TONE = {
  cash: { c: "#2f7d4e", fill: "linear-gradient(180deg, #48a86b 0%, #2f7d4e 100%)" },
  card: { c: "#2a4b8d", fill: "linear-gradient(180deg, #5b7fd4 0%, #2a4b8d 100%)" },
  mobilepayment: { c: "#5b3fa8", fill: "linear-gradient(180deg, #8b6fe0 0%, #5b3fa8 100%)" },
  complimentary: { c: "#6b5744", fill: "linear-gradient(180deg, #a08a72 0%, #6b5744 100%)" },
  foodpanda: { c: "#a3243b", fill: "linear-gradient(180deg, #d1495f 0%, #a3243b 100%)" },
};

function initials(name) {
  return String(name || "W")
    .replace(/[^A-Za-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
}

export default function SalesDataTable({ sales, loading, onExport }) {
  const [filter, setFilter] = useState("all");
  const [sortKey, setSortKey] = useState("time");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState({});
  const [enter, setEnter] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    setFilter("all");
    setPage(1);
    setPicked({});
  }, [sales]);

  useEffect(() => {
    const t = setTimeout(() => setEnter(false), 1100);
    return () => clearTimeout(t);
  }, []);

  const rows = useMemo(
    () =>
      (sales || []).map((s) => ({
        id: s.id || s.bill_number,
        bill: s.bill_number || "—",
        timeMs: parseUtcMs(s.created_date),
        time: saleTimePkt(s.created_date),
        customer: s.customer_name || "Walk-in",
        total: Number(s.total_amount || 0),
        method: s.payment_method || "Cash",
        items: s.items || [],
      })),
    [sales]
  );

  const methods = useMemo(() => {
    const counts = {};
    for (const r of rows) counts[r.method] = (counts[r.method] || 0) + 1;
    return Object.keys(counts)
      .sort((a, b) => (METHOD_RANK[methodKey(a)] ?? 9) - (METHOD_RANK[methodKey(b)] ?? 9))
      .map((m) => ({ method: m, count: counts[m] }));
  }, [rows]);

  const matching = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.method === filter)),
    [rows, filter]
  );

  const sorted = useMemo(() => {
    const list = [...matching];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "time") return (a.timeMs - b.timeMs) * dir;
      if (sortKey === "total") return (a.total - b.total) * dir;
      if (sortKey === "method") {
        return ((METHOD_RANK[methodKey(a.method)] ?? 9) - (METHOD_RANK[methodKey(b.method)] ?? 9)) * dir;
      }
      if (sortKey === "customer") return a.customer.localeCompare(b.customer) * dir;
      return a.bill.localeCompare(b.bill) * dir;
    });
    return list;
  }, [matching, sortKey, sortDir]);

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * PER_PAGE;
  const slice = sorted.slice(start, start + PER_PAGE);

  const selectedCount = Object.keys(picked).filter((k) => picked[k]).length;
  const pagePicked = slice.filter((r) => picked[r.id]).length;
  const allOnPage = slice.length > 0 && pagePicked === slice.length;

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const changeSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "total" || key === "time" ? "desc" : "asc");
    }
    setPage(1);
  };

  const toggleRow = (id) => setPicked((p) => ({ ...p, [id]: !p[id] }));

  const togglePage = () => {
    const next = { ...picked };
    slice.forEach((r) => {
      if (allOnPage) delete next[r.id];
      else next[r.id] = true;
    });
    setPicked(next);
  };

  const exportNow = (scope) => {
    const list = scope === "selected" ? rows.filter((r) => picked[r.id]) : sorted;
    if (!list.length) {
      showToast("Nothing to export");
      return;
    }
    onExport(list);
    showToast(`${list.length} ${list.length === 1 ? "bill" : "bills"} exported`);
  };

  const sortIcon = (
    <svg className="srt-sort-ind" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
    </svg>
  );

  const sortHeader = (key, label, className) => (
    <th className={`srt-th ${className}`} scope="col" aria-sort={sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
      <button type="button" className="srt-sort" onClick={() => changeSort(key)}>
        {label} {sortIcon}
      </button>
    </th>
  );

  return (
    <section className="srt-section" data-enter={enter ? "" : undefined}>
      <div className="srt-card" data-bulk={selectedCount > 0 ? "on" : "off"}>
        <div className="srt-shell" data-toast={toast ? "on" : "off"}>
          <div className="srt-head">
            <div className="srt-titles">
              <h3 className="srt-title">Transactions</h3>
              <p className="srt-meta">
                {rows.length} {rows.length === 1 ? "bill" : "bills"} · {PER_PAGE} per page
              </p>
            </div>
            <span className="srt-export">
              <button type="button" className="srt-btn" onClick={() => exportNow("all")} disabled={loading || !rows.length}>
                <span className="srt-beam-track" aria-hidden="true"><span className="srt-beam" /></span>
                <Download /> Export CSV
              </button>
            </span>
          </div>

          <div className="srt-toolwrap">
            <div className="srt-tools">
              <div className="srt-chips" role="group" aria-label="Filter by payment method">
                <button
                  type="button"
                  className="srt-fcard"
                  data-filter="all"
                  aria-pressed={filter === "all"}
                  style={{ "--srt-i": 0 }}
                  onClick={() => { setFilter("all"); setPage(1); }}
                >
                  <span className="srt-fcard-dot" aria-hidden="true" />
                  <span className="srt-fcard-name">All</span>
                  <span className="srt-fcard-n">{rows.length}</span>
                </button>
                {methods.map((m, i) => {
                  const tone = PILL_TONE[methodKey(m.method)] || PILL_TONE.complimentary;
                  return (
                    <button
                      key={m.method}
                      type="button"
                      className="srt-fcard"
                      data-filter={m.method}
                      aria-pressed={filter === m.method}
                      style={{
                        "--srt-i": i + 1,
                        "--srt-fc": tone.c,
                        "--srt-fc-fill": tone.fill,
                        "--srt-fc-ink": "#ffffff",
                      }}
                      onClick={() => { setFilter(m.method); setPage(1); }}
                    >
                      <span className="srt-fcard-dot" aria-hidden="true" />
                      <span className="srt-fcard-name">{SHORT_LABEL[m.method] || m.method}</span>
                      <span className="srt-fcard-n">{m.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="srt-bulk" aria-live="polite">
              <span className="srt-bulk-n">{selectedCount} selected</span>
              <span className="srt-spacer" />
              <button type="button" className="srt-btn srt-btn--ghost" onClick={() => setPicked({})}>
                Clear
              </button>
              <button type="button" className="srt-btn srt-btn--primary" onClick={() => exportNow("selected")}>
                <Download /> Export selected
              </button>
            </div>
          </div>

          <div className="srt-tablewrap">
            <table className="srt-table">
              <thead className="srt-thead">
                <tr>
                  <th className="srt-th srt-th--pick" scope="col">
                    <label className="srt-check">
                      <input
                        type="checkbox"
                        className="srt-check-input"
                        checked={allOnPage}
                        onChange={togglePage}
                        aria-label="Select all bills on this page"
                      />
                      <span className="srt-check-box" aria-hidden="true">
                        <svg className="srt-check-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                      </span>
                    </label>
                  </th>
                  {sortHeader("bill", "Bill", "srt-th--bill")}
                  {sortHeader("time", "Time", "srt-th--time")}
                  {sortHeader("customer", "Customer", "srt-th--cust")}
                  <th className="srt-th srt-th--items" scope="col">Items</th>
                  {sortHeader("total", "Total", "srt-th--total")}
                  {sortHeader("method", "Payment", "srt-th--method")}
                </tr>
              </thead>
              <tbody className="srt-tbody">
                {slice.map((row, idx) => (
                  <tr className="srt-row" key={row.id} style={{ "--srt-i": idx }}>
                    <td className="srt-cell srt-cell--pick">
                      <span className="srt-rowline" aria-hidden="true" />
                      <label className="srt-check">
                        <input
                          type="checkbox"
                          className="srt-check-input"
                          checked={!!picked[row.id]}
                          onChange={() => toggleRow(row.id)}
                          aria-label={`Select bill ${row.bill}`}
                        />
                        <span className="srt-check-box" aria-hidden="true">
                          <svg className="srt-check-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                        </span>
                      </label>
                    </td>
                    <td className="srt-cell srt-cell--bill"><span className="srt-bill">{row.bill}</span></td>
                    <td className="srt-cell srt-cell--time"><span className="srt-time">{row.time}</span></td>
                    <td className="srt-cell srt-cell--cust">
                      <span className="srt-avatar" aria-hidden="true">{initials(row.customer)}</span>
                      <span className="srt-name">{row.customer}</span>
                    </td>
                    <td className="srt-cell srt-cell--items">
                      <span className="srt-items">
                        {row.items.length === 0 && <span className="srt-item"><span className="srt-item-name">No items recorded</span></span>}
                        {row.items.map((i, n) => (
                          <span className="srt-item" key={n}>
                            <span className="srt-item-qty">{i.quantity}×</span>
                            <span className="srt-item-name">{i.product_name}</span>
                            <span className="srt-item-amt">{fmtPKR(lineTotal(i))}</span>
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="srt-cell srt-cell--total"><span className="srt-total">{fmtPKR(row.total)}</span></td>
                    <td className="srt-cell srt-cell--method">
                      <span className={`srt-badge srt-badge--${methodKey(row.method)}`}>{row.method}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <div className="srt-skel" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => <div className="srt-skel-row" key={i} />)}
              </div>
            )}

            {!loading && sorted.length === 0 && (
              <div className="srt-empty">
                <span className="srt-empty-ico"><Inbox /></span>
                <span className="srt-empty-t">No bills for this filter</span>
                <p className="srt-empty-p">
                  Nothing was recorded with this payment method on the selected day. Pick another filter or change the date.
                </p>
              </div>
            )}
          </div>

          <div className="srt-foot">
            <div className="srt-range">
              {sorted.length ? `Showing ${slice.length} of ${sorted.length}` : "No bills to show"}
            </div>
            <div className="srt-meter" aria-hidden="true">
              <span className="srt-meter-fill" style={{ width: sorted.length ? `${(((start + slice.length) / sorted.length) * 100).toFixed(1)}%` : "0%" }} />
            </div>
            <div className="srt-pager">
              <button type="button" className="srt-page" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className="srt-page"
                  aria-current={safePage === i + 1 ? "page" : undefined}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button type="button" className="srt-page" aria-label="Next page" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>

          <div className="srt-toast" role="status" aria-live="polite">
            <Check />
            <span>{toast}</span>
          </div>
        </div>
      </div>
    </section>
  );
}