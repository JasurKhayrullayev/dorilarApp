import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";
import { fmtSum, fmtDate } from "../utils/helpers";

type Sale = {
  id: number;
  total_amount: string;
  discount_amount?: string;
  notes?: string;
  created_at: string;
  customer: number;
  pharmacist?: number;
};

type RxItem = {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  fulfilled_qty: number;
};

type Rx = {
  id: number;
  number: string;
  customer_name?: string;
  status: string;
  items: RxItem[];
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  sent:    { bg: "#ccfbf1", color: "#0f766e" },
  partial: { bg: "#fef3c7", color: "#92400e" },
  created: { bg: "#f1f5f9", color: "#475569" },
};

export default function SalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [rxList, setRxList] = useState<Rx[]>([]);
  const [open, setOpen] = useState(false);
  const [rxId, setRxId] = useState<number | "">("");
  const [selectedRx, setSelectedRx] = useState<Rx | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canSell = ["pharmacist", "manager", "admin"].includes(user?.role ?? "");

  async function load() {
    const [s, r] = await Promise.all([
      api.get<Sale[]>("/sales/"),
      api.get<Rx[]>("/prescriptions/"),
    ]);
    setSales(Array.isArray(s.data) ? s.data : []);
    const all = Array.isArray(r.data) ? r.data : [];
    // Faqat "sent" yoki "partial" holatdagi retseptlarni ko'rsat
    setRxList(all.filter((rx) => ["sent", "partial"].includes(rx.status)));
  }

  useEffect(() => { void load().catch(() => setErr("Yuklanmadi.")); }, []);

  useEffect(() => {
    if (!rxId) { setSelectedRx(null); return; }
    const rx = rxList.find((x) => x.id === rxId) ?? null;
    setSelectedRx(rx);
    const m: Record<number, number> = {};
    rx?.items.forEach((it) => {
      const left = it.quantity - it.fulfilled_qty;
      m[it.product] = left > 0 ? left : 0;
    });
    setQtyMap(m);
  }, [rxId, rxList]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRx) return;
    const items = Object.entries(qtyMap)
      .map(([product, quantity]) => ({ product: Number(product), quantity }))
      .filter((x) => x.quantity > 0);
    if (!items.length) { setErr("Kamida bitta mahsulot miqdori kiriting."); return; }
    setErr(""); setSaving(true);
    try {
      await api.post("/sales/complete/", { prescription: selectedRx.id, items, notes });
      setOpen(false); setRxId(""); setNotes("");
      await load();
    } catch {
      setErr("Sotuv bajarilmadi (ombor yoki retsept).");
    } finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const matchId   = search ? String(s.id).includes(search) : true;
      const sDate     = s.created_at.slice(0, 10);
      const matchFrom = dateFrom ? sDate >= dateFrom : true;
      const matchTo   = dateTo ? sDate <= dateTo : true;
      return matchId && matchFrom && matchTo;
    });
  }, [sales, search, dateFrom, dateTo]);

  const totalSum = useMemo(
    () => filtered.reduce((acc, s) => acc + Number(s.total_amount), 0),
    [filtered]
  );
  const totalDiscount = useMemo(
    () => filtered.reduce((acc, s) => acc + Number(s.discount_amount ?? 0), 0),
    [filtered]
  );

  return (
    <div>
      <div className="page-header">
        <h2>🛒 Sotuvlar</h2>
        {canSell && (
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            + Sotuv qilish
          </button>
        )}
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="🔍 Sotuv ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 140 }}
        />
        <div className="filter-group">
          <label>Dan:</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Gacha:</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <button className="btn ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
            onClick={() => { setDateFrom(""); setDateTo(""); }}>
            ✕ Tozalash
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#64748b" }}>
          {filtered.length} ta sotuv
        </span>
      </div>

      {err && <p className="error">⚠ {err}</p>}

      {filtered.length > 0 && (
        <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem", fontSize: "0.875rem", color: "#475569" }}>
          <span>Jami: <strong className="amount">{fmtSum(totalSum)}</strong></span>
          {totalDiscount > 0 && (
            <span>Chegirma: <strong className="amount discount">− {fmtSum(totalDiscount)}</strong></span>
          )}
        </div>
      )}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Summa</th>
              <th>Chegirma</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>Sotuv topilmadi</td></tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id}>
                <td style={{ color: "#94a3b8", fontSize: "0.8rem" }}>#{s.id}</td>
                <td className="amount">{fmtSum(s.total_amount)}</td>
                <td>
                  {Number(s.discount_amount) > 0
                    ? <span className="amount discount">− {fmtSum(s.discount_amount)}</span>
                    : <span style={{ color: "#94a3b8" }}>—</span>}
                </td>
                <td style={{ fontSize: "0.82rem", color: "#64748b" }}>{fmtDate(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box">
            <h3>Retsept bo'yicha sotuv</h3>
            <form onSubmit={submit}>
              <div className="field">
                <label>Retsept *</label>
                <select value={rxId} onChange={(e) => setRxId(e.target.value ? Number(e.target.value) : "")} required>
                  <option value="">— tanlang —</option>
                  {rxList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.number}{r.customer_name ? ` — ${r.customer_name}` : ""}
                      {" "}
                      ({r.status === "partial" ? "Qisman" : "Kutmoqda"})
                    </option>
                  ))}
                </select>
              </div>

              {selectedRx && (
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem", marginBottom: "0.75rem", background: "#f8fafc" }}>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.5rem", fontWeight: 600 }}>
                    MAHSULOTLAR
                  </div>
                  {selectedRx.items.map((it) => {
                    const left = it.quantity - it.fulfilled_qty;
                    return (
                      <div key={it.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                        <span style={{ flex: 1, fontSize: "0.875rem" }}>
                          {it.product_name}
                          <span style={{ color: "#64748b", fontSize: "0.78rem" }}> (qoldiq: {left})</span>
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={left}
                          value={qtyMap[it.product] ?? 0}
                          onChange={(e) => setQtyMap((m) => ({ ...m, [it.product]: Number(e.target.value) }))}
                          style={{ width: 72, padding: "0.35rem 0.5rem", border: "1px solid var(--border)", borderRadius: 6, textAlign: "center" }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="field">
                <label>Izoh</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ixtiyoriy…" />
              </div>

              {err && <p className="error">⚠ {err}</p>}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                <button type="submit" className="btn" disabled={saving || !selectedRx}>
                  {saving ? "Bajarilmoqda…" : "✓ Tasdiqlash"}
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
