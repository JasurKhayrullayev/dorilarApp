import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { fmtDate, statusInfo } from "../utils/helpers";

type Call = {
  id: number;
  customer: number;
  customer_name?: string;
  result: string;
  notes: string;
  duration_sec?: number;
  created_at: string;
};

type Customer = { id: number; full_name: string };

const RESULTS = [
  { v: "to_doctor",    l: "Vrachga yo'naltirildi" },
  { v: "repeat_rx",   l: "Takroriy retsept" },
  { v: "callback",    l: "Qayta qo'ng'iroq" },
  { v: "refused",     l: "Rad etdi" },
  { v: "no_answer",   l: "Javob bermadi" },
  { v: "wrong_number",l: "Noto'g'ri raqam" },
];

export default function CallsPage() {
  const [rows, setRows]           = useState<Call[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer]   = useState<number | "">("");
  const [result, setResult]       = useState("to_doctor");
  const [notes, setNotes]         = useState("");
  const [err, setErr]             = useState("");
  const [saving, setSaving]       = useState(false);

  // Filters
  const [search, setSearch]         = useState("");
  const [resultFilter, setResFilter] = useState("");

  async function load() {
    const [c, r] = await Promise.all([
      api.get<Customer[]>("/customers/"),
      api.get<Call[]>("/calls/"),
    ]);
    const custs = Array.isArray(c.data) ? c.data : [];
    setCustomers(custs);
    const calls = Array.isArray(r.data) ? r.data : [];
    // Enrich with customer_name
    const custMap = Object.fromEntries(custs.map((c) => [c.id, c.full_name]));
    setRows(calls.map((call) => ({ ...call, customer_name: custMap[call.customer] })));
  }

  useEffect(() => { void load().catch(() => setErr("Yuklanmadi.")); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setSaving(true);
    try {
      await api.post("/calls/", { customer, result, notes });
      setNotes("");
      await load();
    } catch {
      setErr("Qo'ng'iroq saqlanmadi.");
    } finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const matchSearch = (r.customer_name ?? "").toLowerCase().includes(q) || String(r.id).includes(q);
      const matchResult = resultFilter ? r.result === resultFilter : true;
      return matchSearch && matchResult;
    });
  }, [rows, search, resultFilter]);

  return (
    <div>
      <div className="page-header">
        <h2>📞 Qo'ng'iroqlar</h2>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem", color: "#475569" }}>
          Yangi qo'ng'iroq yozuvi
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <label>Mijoz *</label>
              <select value={customer} onChange={(e) => setCustomer(Number(e.target.value))} required>
                <option value="">— tanlang —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Natija *</label>
              <select value={result} onChange={(e) => setResult(e.target.value)}>
                {RESULTS.map((x) => (
                  <option key={x.v} value={x.v}>{x.l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Izoh</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ixtiyoriy…" />
          </div>
          {err && <p className="error">⚠ {err}</p>}
          <button type="submit" className="btn" disabled={saving || !customer}>
            {saving ? "Saqlanmoqda…" : "✓ Saqlash"}
          </button>
        </form>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="🔍 Mijoz nomi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-group">
          <label>Natija:</label>
          <select value={resultFilter} onChange={(e) => setResFilter(e.target.value)}>
            <option value="">Hammasi</option>
            {RESULTS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
          </select>
        </div>
        <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#64748b" }}>
          {filtered.length} ta yozuv
        </span>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Mijoz</th>
              <th>Natija</th>
              <th>Izoh</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>Yozuv topilmadi</td></tr>
            )}
            {filtered.map((r) => {
              const st = statusInfo(r.result);
              return (
                <tr key={r.id}>
                  <td style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{r.id}</td>
                  <td style={{ fontWeight: 500 }}>{r.customer_name ?? `#${r.customer}`}</td>
                  <td>
                    <span className="badge" style={{ background: st.color + "22", color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "#475569", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.notes || "—"}
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "#64748b" }}>{fmtDate(r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
