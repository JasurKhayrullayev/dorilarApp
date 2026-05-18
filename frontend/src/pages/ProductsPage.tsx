import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";
import { fmtSum, fmtDate } from "../utils/helpers";

type Product = {
  id: number;
  name: string;
  price: string;
  stock_qty: number;
  min_stock_alert: number;
  category_type: string;
  expiry_date?: string | null;
  description?: string;
};

const CAT_LABELS: Record<string, string> = {
  vitamins: "Vitaminlar", minerals: "Minerallar", plants: "O'simlik",
  probiotics: "Probiotiklar", other: "Boshqa",
};

export default function ProductsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Product[]>([]);
  const [canEdit] = useState(() =>
    user?.role === "admin" || user?.role === "manager"
  );

  // Filters
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");

  // Form
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [catType, setCatType] = useState("other");
  const [description, setDescription] = useState("");
  const [minStock, setMinStock] = useState(5);
  const [expiryDate, setExpiryDate] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get<Product[]>("/products/");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => { void load().catch(() => setErr("Yuklanmadi.")); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setSaving(true);
    try {
      await api.post("/products/", {
        name, price, category_type: catType,
        description, min_stock_alert: minStock,
        expiry_date: expiryDate || null,
      });
      setOpen(false);
      setName(""); setPrice(""); setDescription(""); setExpiryDate(""); setMinStock(5);
      await load();
    } catch {
      setErr("Mahsulot qo'shilmadi.");
    } finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchCat  = catFilter ? p.category_type === catFilter : true;
      const matchStock = stockFilter === "low"
        ? p.stock_qty <= p.min_stock_alert
        : stockFilter === "ok"
          ? p.stock_qty > p.min_stock_alert
          : true;
      return matchName && matchCat && matchStock;
    });
  }, [rows, search, catFilter, stockFilter]);

  return (
    <div>
      <div className="page-header">
        <h2>💊 Mahsulotlar katalogi</h2>
        {canEdit && (
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            + Qo'shish
          </button>
        )}
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="🔍 Nomi bo'yicha qidirish…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-group">
          <label>Kategoriya:</label>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="">Hammasi</option>
            {Object.entries(CAT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Qoldiq:</label>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="">Hammasi</option>
            <option value="low">⚠ Kam qoldiq</option>
            <option value="ok">✓ Yetarli</option>
          </select>
        </div>
        <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#64748b" }}>
          {filtered.length} ta mahsulot
        </span>
      </div>

      {err && <p className="error">⚠ {err}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nomi</th>
              <th>Kategoriya</th>
              <th>Narx</th>
              <th>Ombor</th>
              <th>Min.</th>
              <th>Muddati</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>Mahsulot topilmadi</td></tr>
            )}
            {filtered.map((p) => {
              const lowStock = p.stock_qty <= p.min_stock_alert;
              const today = new Date();
              const expiry = p.expiry_date ? new Date(p.expiry_date) : null;
              const daysLeft = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000) : null;
              const expiryWarn = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;
              const expired = daysLeft !== null && daysLeft < 0;
              return (
                <tr key={p.id} className={lowStock ? "row-warn" : ""}>
                  <td style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{p.id}</td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    {lowStock && (
                      <span
                        className="badge"
                        style={{ marginLeft: "0.4rem", background: "#fee2e2", color: "#991b1b", fontSize: "0.68rem" }}
                      >
                        ⚠ Kam
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{ background: "#f1f5f9" }}>
                      {CAT_LABELS[p.category_type] ?? p.category_type}
                    </span>
                  </td>
                  <td className="amount">{fmtSum(p.price)}</td>
                  <td className={lowStock ? "stock-low" : "stock-ok"}>{p.stock_qty} ta</td>
                  <td style={{ color: "#94a3b8" }}>{p.min_stock_alert}</td>
                  <td style={{ fontSize: "0.82rem" }}>
                    {expired ? (
                      <span style={{ color: "#dc2626", fontWeight: 600 }}>
                        ✗ {fmtDate(p.expiry_date!, false)}
                      </span>
                    ) : expiryWarn ? (
                      <span style={{ color: "#d97706", fontWeight: 600 }}>
                        ⏰ {fmtDate(p.expiry_date!, false)} ({daysLeft} kun)
                      </span>
                    ) : p.expiry_date ? (
                      <span style={{ color: "#475569" }}>{fmtDate(p.expiry_date, false)}</span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box">
            <h3>Yangi mahsulot qo'shish</h3>
            <form onSubmit={add}>
              <div className="field">
                <label>Nomi *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="field">
                  <label>Narx (so'm) *</label>
                  <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Minimal qoldiq</label>
                  <input type="number" min={0} value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="field">
                  <label>Kategoriya</label>
                  <select value={catType} onChange={(e) => setCatType(e.target.value)}>
                    {Object.entries(CAT_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Muddati (yaroqlilik)</label>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Tavsif</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              {err && <p className="error">⚠ {err}</p>}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Saqlanmoqda…" : "Saqlash"}
                </button>
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
