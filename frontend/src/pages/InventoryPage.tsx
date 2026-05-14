import { useEffect, useState } from "react";
import api from "../api/client";

type Mov = {
  id: number;
  product: number;
  movement_type: string;
  quantity: number;
  created_at: string;
};

export default function InventoryPage() {
  const [rows, setRows] = useState<Mov[]>([]);
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [product, setProduct] = useState<number | "">("");
  const [quantity, setQuantity] = useState(10);
  const [err, setErr] = useState("");

  async function load() {
    const m = await api.get<Mov[]>("/inventory-movements/");
    setRows(Array.isArray(m.data) ? m.data : []);
    const p = await api.get<{ id: number; name: string }[]>("/products/");
    setProducts(Array.isArray(p.data) ? p.data : []);
  }

  useEffect(() => {
    void load().catch(() => setErr("Yuklanmadi."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/inventory-movements/", {
        product,
        movement_type: "in",
        quantity,
        batch_number: "",
      });
      setQuantity(10);
      await load();
    } catch {
      setErr("Harakat saqlanmadi.");
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Ombor harakatlari</h2>
      <form className="card" onSubmit={submit} style={{ marginBottom: "1rem", maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Kirim</h3>
        <div className="field">
          <label>Mahsulot</label>
          <select value={product} onChange={(e) => setProduct(Number(e.target.value))} required>
            <option value="">—</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Miqdor</label>
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </div>
        <button type="submit" className="btn">
          Kirimni qayd etish
        </button>
        {err ? <p className="error">{err}</p> : null}
      </form>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Mahsulot</th>
              <th>Turi</th>
              <th>Miqdor</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.product}</td>
                <td>{r.movement_type}</td>
                <td>{r.quantity}</td>
                <td>{new Date(r.created_at).toLocaleString("uz-UZ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
