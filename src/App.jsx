import { useEffect, useState } from "react";
import { DESCRIPTIONS, COMPANY } from "./descriptions.js";

import IMAGE1 from "./image1.jpg";
import IMAGE2 from "./image2.jpg";

const MAX_ROWS = 10;
const CUSTOM = "__custom__";
const KEY = "pro-invoice-draft-v2";
const ITEMS_KEY = "pro-invoice-descriptions-v2";
const BASE = JSON.stringify(DESCRIPTIONS); // fingerprint of descriptions.js

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// date is stored as YYYY-MM-DD (needed by the date picker)
const todayISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};
// shown on the printed invoice as 13/SEP/2022
const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]}/${MONTHS[Number(m[2]) - 1]}/${m[1]}` : "";
};

const blankRow = () => ({ desc: "", custom: false, qty: 1, rate: 0 });
const blank = () => ({
  client: "", address: "DUBAI", date: todayISO(), contact: "", payment: "",
  email: "", project: "", job: "", serviceCharge: 0, rows: [blankRow()],
});

function load() {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : blank();
  } catch {
    return blank();
  }
}

function loadItems() {
  try {
    const s = localStorage.getItem(ITEMS_KEY);
    if (!s) return DESCRIPTIONS;
    const saved = JSON.parse(s);
    // use the browser-saved list only if descriptions.js has not changed since
    return saved.base === BASE ? saved.items : DESCRIPTIONS;
  } catch {
    return DESCRIPTIONS;
  }
}

export default function App() {
  const [inv, setInv] = useState(load);
  const [items, setItems] = useState(loadItems);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(inv)); } catch { }
  }, [inv]);

  const set = (k, v) => setInv((p) => ({ ...p, [k]: v }));
  const setRow = (i, patch) =>
    setInv((p) => ({ ...p, rows: p.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));

  const pick = (i, value) => {
    if (value === CUSTOM) return setRow(i, { custom: true, desc: "", rate: 0 });
    const found = items.find((d) => d.name === value);
    setRow(i, { custom: false, desc: value, rate: found ? found.rate : 0 });
  };

  const addRow = () => inv.rows.length < MAX_ROWS && set("rows", [...inv.rows, blankRow()]);
  const delRow = (i) => set("rows", inv.rows.filter((_, idx) => idx !== i));
  const reset = () => window.confirm("Start a new invoice?") && setInv(blank());

  // ----- edit descriptions & prices -----
  const openEditor = () => { setDraft(items.map((d) => ({ ...d }))); setEditing(true); };
  const setDraftItem = (i, patch) =>
    setDraft((p) => p.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const saveItems = () => {
    const clean = draft
      .filter((d) => String(d.name).trim() !== "")
      .map((d) => ({ name: String(d.name).trim(), rate: round2(d.rate) }));
    setItems(clean);
    try { localStorage.setItem(ITEMS_KEY, JSON.stringify({ base: BASE, items: clean })); } catch { }
    setEditing(false);
  };
  const resetItems = () => {
    if (!window.confirm("Go back to the original list from descriptions.js?")) return;
    try { localStorage.removeItem(ITEMS_KEY); } catch { }
    setItems(DESCRIPTIONS);
    setDraft(DESCRIPTIONS.map((d) => ({ ...d })));
  };
  const copyCode = () => {
    const body = draft
      .filter((d) => String(d.name).trim() !== "")
      .map((d) => `  { name: ${JSON.stringify(String(d.name).trim())}, rate: ${round2(d.rate)} },`)
      .join("\n");
    navigator.clipboard?.writeText(`export const DESCRIPTIONS = [\n${body}\n];`);
    alert("Copied. Paste it into src/descriptions.js to make it permanent for everyone.");
  };

  const lineTotal = (r) => round2((Number(r.qty) || 0) * (Number(r.rate) || 0));
  const subTotal = round2(inv.rows.reduce((s, r) => s + lineTotal(r), 0));
  const service = round2(inv.serviceCharge);
  const grand = round2(subTotal + service);

  return (
    <div className="page">
      <div className="toolbar no-print">
        <button className="primary" onClick={() => window.print()}>Print / Save PDF</button>
        <button onClick={reset}>New invoice</button>
        <button onClick={openEditor}>Edit descriptions &amp; prices</button>
        <span className="hint">Your work is saved automatically in this browser.</span>
      </div>

      {editing && (
        <div className="editor no-print">
          <h3>Descriptions &amp; prices</h3>
          <div className="erow ehead"><span>Description</span><span>Price (AED)</span><span /></div>
          {draft.map((d, i) => (
            <div className="erow" key={i}>
              <input value={d.name} placeholder="Description"
                onChange={(e) => setDraftItem(i, { name: e.target.value })} />
              <input type="number" min="0" step="0.01" value={d.rate}
                onChange={(e) => setDraftItem(i, { rate: e.target.value })} />
              <button className="x" title="Delete" onClick={() => setDraft(draft.filter((_, idx) => idx !== i))}>×</button>
            </div>
          ))}
          <div className="ebtns">
            <button onClick={() => setDraft([...draft, { name: "", rate: 0 }])}>+ Add description</button>
            <button className="primary" onClick={saveItems}>Save list</button>
            <button onClick={() => setEditing(false)}>Cancel</button>
            <button onClick={copyCode}>Copy as code</button>
            <button onClick={resetItems}>Reset to original</button>
          </div>
        </div>
      )}

      <div className="sheet">
        <header className="head">
          <div className="img-left">{IMAGE1 && <img src={IMAGE1} alt="Logo left" />}</div>
          <div className="title">
            <h1>{COMPANY.title}</h1>
            <h2>{COMPANY.subtitle}</h2>
          </div>
          <div className="img-right">{IMAGE2 && <img src={IMAGE2} alt="Logo right" />}</div>
        </header>
        <div className="bar" />

        <section className="meta">
          <div className="metacol">
            <label>Client :<input value={inv.client} onChange={(e) => set("client", e.target.value)} /></label>
            <label>Address :<input value={inv.address} onChange={(e) => set("address", e.target.value)} /></label>
            <label>Contact No :<input value={inv.contact} onChange={(e) => set("contact", e.target.value)} /></label>
            <label>Email :<input value={inv.email} onChange={(e) => set("email", e.target.value)} /></label>
          </div>
          <div className="metacol">
            <label>Project Name :<input value={inv.project} onChange={(e) => set("project", e.target.value)} /></label>
            <label>Date :
              <input className="no-print" type="date" value={inv.date}
                onChange={(e) => set("date", e.target.value)} />
              <span className="print-only">{fmtDate(inv.date)}</span>
            </label>
            <label>Payment Type :<input value={inv.payment} onChange={(e) => set("payment", e.target.value)} /></label>
            <label>Job Description :<input value={inv.job} onChange={(e) => set("job", e.target.value)} /></label>
          </div>
        </section>

        <table className="items">
          <thead>
            <tr>
              <th className="c-no">SL NO</th>
              <th>DESCRIPTION</th>
              <th className="c-qty">QTY</th>
              <th className="c-rate">RATE</th>
              <th className="c-amt" colSpan={2}>AMOUNT</th>
              <th className="no-print c-x" />
            </tr>
          </thead>
          <tbody>
            {inv.rows.map((r, i) => (
              <tr key={i}>
                <td className="center">{i + 1}</td>
                <td>
                  {r.custom ? (
                    <input
                      className="desc no-print"
                      autoFocus
                      placeholder="Type description"
                      value={r.desc}
                      onChange={(e) => setRow(i, { desc: e.target.value })}
                    />
                  ) : (
                    <select className="desc no-print" value={r.desc} onChange={(e) => pick(i, e.target.value)}>
                      <option value="">Select description…</option>
                      {items.map((d) => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                      <option value={CUSTOM}>Other (type my own)</option>
                    </select>
                  )}
                  <span className="print-only">{r.desc}</span>
                </td>
                <td>
                  <input className="num center" type="number" min="0" value={r.qty}
                    onChange={(e) => setRow(i, { qty: e.target.value })} />
                </td>
                <td>
                  <input className="num center" type="number" min="0" step="0.01" value={r.rate}
                    onChange={(e) => setRow(i, { rate: e.target.value })} />
                </td>
                <td className="cur">AED</td>
                <td className="amt">{money(lineTotal(r))}</td>
                <td className="no-print c-x">
                  <button className="x" title="Remove row" onClick={() => delRow(i)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inv.rows.length < MAX_ROWS && (
          <button className="add no-print" onClick={addRow}>+ Add row</button>
        )}
        <div className="bar" />

        <section className="totals">
          <div className="trow"><span>SUB TOTAL</span><span className="cur">AED</span><b>{money(subTotal)}</b></div>
          <div className="trow">
            <span>SERVICE CHARGE</span><span className="cur">AED</span>
            <input className="num right" type="number" min="0" step="0.01" value={inv.serviceCharge}
              onChange={(e) => set("serviceCharge", e.target.value)} />
          </div>
          <div className="trow grand"><span>GRAND TOTAL</span><span className="cur">AED</span><b>{money(grand)}</b></div>
        </section>

        <footer className="sign">{COMPANY.signedBy}</footer>
      </div>
    </div>
  );
}