import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";

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
  status: string;
  created_at: string;
  items: Item[];
};

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Rx[]>([]);
  const [customers, setCustomers] = useState<{ id: number; full_name: string }[]>([]);
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<number | "">("");
  const [diagnosis, setDiagnosis] = useState("");
  const [pid, setPid] = useState<number | "">("");
  const [qty, setQty] = useState(1);
  const [lines, setLines] = useState<{ product: number; quantity: number; times_per_day: number; duration_days: number; instructions: string }[]>([]);
  const [err, setErr] = useState("");

  const canCreate = user?.role === "doctor" || user?.role === "manager" || user?.role === "admin";

  async function load() {
    const { data } = await api.get<Rx[]>("/prescriptions/");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load().catch(() => setErr("Retseptlar yuklanmadi."));
    void api.get("/customers/").then((r) => {
      const d = r.data as { id: number; full_name: string }[];
      setCustomers(Array.isArray(d) ? d : []);
    });
    void api.get("/products/").then((r) => {
      const d = r.data as { id: number; name: string }[];
      setProducts(Array.isArray(d) ? d : []);
    });
  }, []);

  function addLine() {
    if (!pid || !qty) return;
    setLines((prev) => [
      ...prev,
      { product: Number(pid), quantity: qty, times_per_day: 1, duration_days: 30, instructions: "" },
    ]);
    setPid("");
    setQty(1);
  }

  async function saveRx(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/prescriptions/", {
        customer,
        diagnosis,
        items: lines,
      });
      setOpen(false);
      setLines([]);
      setDiagnosis("");
      setCustomer("");
      await load();
    } catch (ex: unknown) {
      const msg = (ex as { response?: { data?: unknown } })?.response?.data;
      setErr(typeof msg === "object" ? JSON.stringify(msg) : "Xato");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Retseptlar</h2>
        {canCreate ? (
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            Yangi retsept
          </button>
        ) : null}
      </div>
      {err ? <p className="error">{err}</p> : null}
      <div className="card table-wrap" style={{ marginTop: "1rem" }}>
        <table>
          <thead>
            <tr>
              <th>Raqam</th>
              <th>Mijoz</th>
              <th>Holat</th>
              <th>Sana</th>
              <th>Qatorlar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.number}</td>
                <td>{r.customer_name}</td>
                <td>{r.status}</td>
                <td>{new Date(r.created_at).toLocaleString("uz-UZ")}</td>
                <td>
                  {(r.items || []).map((i) => (
                    <div key={i.id}>
                      {i.product_name} ×{i.quantity} (berildi: {i.fulfilled_qty})
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open ? (
        <div
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgb(15 23 42 / 0.45)",
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            zIndex: 20,
            overflow: "auto",
          }}
        >
          <div className="card" style={{ width: "min(560px, 100%)", margin: "1rem 0" }}>
            <h3 style={{ marginTop: 0 }}>Retsept yaratish</h3>
            <form onSubmit={saveRx}>
              <div className="field">
                <label>Mijoz</label>
                <select value={customer} onChange={(e) => setCustomer(Number(e.target.value))} required>
                  <option value="">— tanlang —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Tashxis</label>
                <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2} />
              </div>
              <div style={{ border: "1px solid var(--border)", padding: "0.75rem", borderRadius: 8, marginBottom: "0.75rem" }}>
                <strong>Mahsulotlar</strong>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  <select value={pid} onChange={(e) => setPid(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">Mahsulot</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 80 }} />
                  <button type="button" className="btn secondary" onClick={addLine}>
                    Qatorga
                  </button>
                </div>
                <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
                  {lines.map((l, i) => (
                    <li key={i}>
                      #{l.product} — {l.quantity} dona
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn" disabled={!lines.length}>
                  Retseptni saqlash
                </button>
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
