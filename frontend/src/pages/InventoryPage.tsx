import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { fmtDate, statusInfo } from "../utils/helpers";

type Mov = {
  id: number;
  product: number;
  product_name?: string;
  movement_type: string;
  quantity: number;
  batch_number?: string;
  created_at: string;
};

type Product = { id: number; name: string; stock_qty: number };

const MOV_TYPES = [
  { v: "in",        l: "Kirim" },
  { v: "out",       l: "Chiqim" },
  { v: "return",    l: "Qaytarish" },
  { v: "write_off", l: "Hisobdan chiqarish" },
];

export default function InventoryPage() {
  const [rows, setRows]         = useState<Mov[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct]   = useState<number | "">("");
  const [quantity, setQuantity] = useState(10);
  const [movType, setMovType]   = useState("in");
  const [batch, setBatch]       = useState("");
  const [err, setErr]           = useState("");
  const [saving, setSaving]     = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch]         = useState("");

  async function load() {
    const [m, p] = await Promise.all([
      api.get<Mov[]>("/inventory-movements/"),
      api.get<Product[]>("/products/"),
    ]);
    const prods = Array.isArray(p.data) ? p.data : [];
    setProducts(prods);
    const prodMap = Object.fromEntries(prods.map((x) => [x.id, x.name]));
    const movs = Array.isArray(m.data) ? m.data : [];
    setRows(movs.map((r) => ({ ...r, product_name: prodMap[r.product] })));
  }

  useEffect(() => { void load().catch(() => setErr("Yuklanmadi.")); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setSaving(true);
    try {
      await api.post("/inventory-movements/", {
        product, movement_type: movType, quantity, batch_number: batch,
      });
      setQuantity(10); setBatch(""); setProduct("");
      await load();
    } catch {
      setErr("Harakat saqlanmadi.");
    } finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const matchType   = typeFilter ? r.movement_type === typeFilter : true;
      const matchSearch = (r.product_name ?? "").toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [rows, typeFilter, search]);

  const currentStock = product ? products.find((p) => p.id === Number(product))?.stock_qty : null;

  return (
    <div>
      <div className="page-header">
        <h2>📦 Ombor harakatlari</h2>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem", color: "#475569" }}>
          Yangi harakat qayd etish
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <label>Mahsulot *</label>
              <select value={product} onChange={(e) => setProduct(Number(e.target.value))} required>
                <option value="">— tanlang —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (ombor: {p.stock_qty})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Turi *</label>
              <select value={movType} onChange={(e) => setMovType(e.target.value)}>
                {MOV_TYPES.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Miqdor *{currentStock !== null ? <span style={{ color: "#64748b" }}> (joriy: {currentStock})</span> : ""}</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 300 }}>
            <label>Partiya raqami</label>
            <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Ixtiyoriy…" />
          </div>
          {err && <p className="error">⚠ {err}</p>}
          <button type="submit" className="btn" disabled={saving || !product}>
            {saving ? "Saqlanmoqda…" : "✓ Qayd etish"}
          </button>
        </form>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="🔍 Mahsulot nomi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-group">
          <label>Turi:</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Hammasi</option>
            {MOV_TYPES.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
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
              <th>Mahsulot</th>
              <th>Turi</th>
              <th>Miqdor</th>
              <th>Partiya</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>Yozuv topilmadi</td></tr>
            )}
            {filtered.map((r) => {
              const st = statusInfo(r.movement_type);
              const isIn = r.movement_type === "in" || r.movement_type === "return";
              return (
                <tr key={r.id}>
                  <td style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{r.id}</td>
                  <td style={{ fontWeight: 500 }}>{r.product_name ?? `#${r.product}`}</td>
                  <td>
                    <span className={`badge badge-${r.movement_type}`}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: isIn ? "#16a34a" : "#dc2626" }}>
                    {isIn ? "+" : "−"}{r.quantity}
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "#64748b" }}>{r.batch_number || "—"}</td>
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
