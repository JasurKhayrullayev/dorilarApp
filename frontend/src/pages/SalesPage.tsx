import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";

type Sale = {
  id: number;
  total_amount: string;
  created_at: string;
  customer: number;
};

type Rx = {
  id: number;
  number: string;
  items: { id: number; product: number; product_name: string; quantity: number; fulfilled_qty: number }[];
};

export default function SalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [rxList, setRxList] = useState<Rx[]>([]);
  const [open, setOpen] = useState(false);
  const [rxId, setRxId] = useState<number | "">("");
  const [selectedRx, setSelectedRx] = useState<Rx | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<number, number>>({});
  const [err, setErr] = useState("");

  const canSell = user?.role === "pharmacist" || user?.role === "manager" || user?.role === "admin";

  async function load() {
    const s = await api.get<Sale[]>("/sales/");
    setSales(Array.isArray(s.data) ? s.data : []);
    const r = await api.get<Rx[]>("/prescriptions/");
    setRxList(Array.isArray(r.data) ? r.data : []);
  }

  useEffect(() => {
    void load().catch(() => setErr("Yuklanmadi."));
  }, []);

  useEffect(() => {
    if (!rxId) {
      setSelectedRx(null);
      return;
    }
    const rx = rxList.find((x) => x.id === rxId) || null;
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
    if (!items.length) {
      setErr("Kamida bitta mahsulot miqdori kiriting.");
      return;
    }
    setErr("");
    try {
      await api.post("/sales/complete/", {
        prescription: selectedRx.id,
        items,
        notes: "",
      });
      setOpen(false);
      setRxId("");
      await load();
    } catch {
      setErr("Sotuv bajarilmadi (ombor yoki retsept).");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Sotuvlar</h2>
        {canSell ? (
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            Retsept bo&apos;yicha sotuv
          </button>
        ) : null}
      </div>
      {err ? <p className="error">{err}</p> : null}
      <div className="card table-wrap" style={{ marginTop: "1rem" }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Summa</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.total_amount}</td>
                <td>{new Date(s.created_at).toLocaleString("uz-UZ")}</td>
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
          }}
        >
          <form className="card" style={{ width: "min(480px, 100%)" }} onSubmit={submit}>
            <h3 style={{ marginTop: 0 }}>Sotuv</h3>
            <div className="field">
              <label>Retsept</label>
              <select value={rxId} onChange={(e) => setRxId(e.target.value ? Number(e.target.value) : "")} required>
                <option value="">— tanlang —</option>
                {rxList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number}
                  </option>
                ))}
              </select>
            </div>
            {selectedRx ? (
              <div style={{ marginBottom: "0.75rem" }}>
                {selectedRx.items.map((it) => {
                  const left = it.quantity - it.fulfilled_qty;
                  return (
                    <div key={it.id} className="field" style={{ marginBottom: "0.5rem" }}>
                      <label>
                        {it.product_name} (qoldiq: {left})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={left}
                        value={qtyMap[it.product] ?? 0}
                        onChange={(e) =>
                          setQtyMap((m) => ({
                            ...m,
                            [it.product]: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn">
                Tasdiqlash
              </button>
              <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
                Bekor
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
