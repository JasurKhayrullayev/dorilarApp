import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";
import { fmtDate, statusInfo } from "../utils/helpers";

type Item = {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  fulfilled_qty: number;
};

type Rx = {
  id: number;
  number: string;
  customer_name: string;
  doctor_name?: string;
  status: string;
  diagnosis?: string;
  created_at: string;
  items: Item[];
};

const STATUS_OPTS = [
  { v: "", l: "Barcha holatlar" },
  { v: "created",   l: "Yaratilgan" },
  { v: "sent",      l: "Yuborilgan" },
  { v: "partial",   l: "Qisman" },
  { v: "sold",      l: "Sotildi" },
  { v: "cancelled", l: "Bekor" },
];

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const [rows, setRows]       = useState<Rx[]>([]);
  const [customers, setCustomers] = useState<{ id: number; full_name: string }[]>([]);
  const [products, setProducts]   = useState<{ id: number; name: string; price: string }[]>([]);

  // Filters
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");

  // Form
  const [open, setOpen]         = useState(false);
  const [customer, setCustomer] = useState<number | "">("");
  const [diagnosis, setDiag]    = useState("");
  const [pid, setPid]           = useState<number | "">("");
  const [qty, setQty]           = useState(1);
  const [tpd, setTpd]           = useState(1);   // times per day
  const [dur, setDur]           = useState(30);  // duration days
  const [lines, setLines]       = useState<{ product: number; product_name: string; quantity: number; times_per_day: number; duration_days: number }[]>([]);
  const [err, setErr]           = useState("");
  const [saving, setSaving]     = useState(false);

  const canCreate = ["doctor","manager","admin"].includes(user?.role ?? "");

  async function load() {
    const { data } = await api.get<Rx[]>("/prescriptions/");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load().catch(() => setErr("Retseptlar yuklanmadi."));
    void api.get<{ id: number; full_name: string }[]>("/customers/").then((r) =>
      setCustomers(Array.isArray(r.data) ? r.data : [])
    );
    void api.get<{ id: number; name: string; price: string }[]>("/products/").then((r) =>
      setProducts(Array.isArray(r.data) ? r.data : [])
    );
  }, []);

  function addLine() {
    if (!pid || !qty) return;
    const prod = products.find((p) => p.id === Number(pid));
    setLines((prev) => [...prev, {
      product: Number(pid),
      product_name: prod?.name ?? String(pid),
      quantity: qty,
      times_per_day: tpd,
      duration_days: dur,
    }]);
    setPid(""); setQty(1); setTpd(1); setDur(30);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveRx(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) { setErr("Kamida bitta mahsulot qo'shing."); return; }
    setErr(""); setSaving(true);
    try {
      await api.post("/prescriptions/", {
        customer,
        diagnosis,
        items: lines.map(({ product, quantity, times_per_day, duration_days }) => ({
          product, quantity, times_per_day, duration_days, instructions: "",
        })),
      });
      setOpen(false); setLines([]); setDiag(""); setCustomer("");
      await load();
    } catch (ex: unknown) {
      const msg = (ex as { response?: { data?: unknown } })?.response?.data;
      setErr(typeof msg === "object" ? JSON.stringify(msg) : "Xato yuz berdi");
    } finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const matchSearch = r.number.toLowerCase().includes(q) || r.customer_name.toLowerCase().includes(q);
      const matchStatus = statusFilter ? r.status === statusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [rows, search, statusFilter]);

  return (
    <div>
      <div className="page-header">
        <h2>📋 Retseptlar</h2>
        {canCreate && (
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            + Yangi retsept
          </button>
        )}
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="🔍 Raqam yoki mijoz nomi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-group">
          <label>Holat:</label>
          <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
        <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#64748b" }}>
          {filtered.length} ta retsept
        </span>
      </div>

      {err && <p className="error">⚠ {err}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Raqam</th>
              <th>Mijoz</th>
              <th>Holat</th>
              <th>Sana</th>
              <th>Mahsulotlar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>Retsept topilmadi</td></tr>
            )}
            {filtered.map((r) => {
              const st = statusInfo(r.status);
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, fontFamily: "monospace" }}>{r.number}</td>
                  <td style={{ fontWeight: 500 }}>{r.customer_name}</td>
                  <td>
                    <span className="badge" style={{ background: st.color + "22", color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "#64748b" }}>{fmtDate(r.created_at)}</td>
                  <td style={{ fontSize: "0.82rem" }}>
                    {(r.items || []).map((i) => (
                      <div key={i.id} style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                        <span>{i.product_name}</span>
                        <span style={{ color: "#94a3b8" }}>×{i.quantity}</span>
                        {i.fulfilled_qty > 0 && (
                          <span style={{ color: "#16a34a", fontSize: "0.75rem" }}>✓{i.fulfilled_qty}</span>
                        )}
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box" style={{ width: "min(600px, 100%)" }}>
            <h3>Yangi retsept</h3>
            <form onSubmit={saveRx}>
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
                <label>Tashxis</label>
                <textarea value={diagnosis} onChange={(e) => setDiag(e.target.value)} rows={2} placeholder="Ixtiyoriy…" />
              </div>

              <div style={{ border: "1px solid var(--border)", padding: "0.85rem", borderRadius: 8, marginBottom: "0.85rem", background: "#f8fafc" }}>
                <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#64748b", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Mahsulot qo'shish
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "0.4rem", alignItems: "end", flexWrap: "wrap" }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: "0.72rem" }}>Mahsulot</label>
                    <select value={pid} onChange={(e) => setPid(e.target.value ? Number(e.target.value) : "")}>
                      <option value="">— tanlang —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: "0.72rem" }}>Miqdor</label>
                    <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: "0.72rem" }}>×/kun</label>
                    <input type="number" min={1} max={10} value={tpd} onChange={(e) => setTpd(Number(e.target.value))} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: "0.72rem" }}>Kun</label>
                    <input type="number" min={1} value={dur} onChange={(e) => setDur(Number(e.target.value))} />
                  </div>
                  <button type="button" className="btn ghost" onClick={addLine} disabled={!pid}>+ Qo'sh</button>
                </div>

                {lines.length > 0 && (
                  <div style={{ marginTop: "0.6rem" }}>
                    {lines.map((l, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.875rem" }}>
                        <span style={{ flex: 1 }}>
                          <strong>{l.product_name}</strong>
                          <span style={{ color: "#64748b" }}> × {l.quantity} ta, {l.times_per_day}×/kun, {l.duration_days} kun</span>
                        </span>
                        <button type="button" onClick={() => removeLine(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "0 4px" }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {err && <p className="error">⚠ {err}</p>}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn" disabled={saving || !lines.length}>
                  {saving ? "Saqlanmoqda…" : "✓ Retseptni saqlash"}
                </button>
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>Bekor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
