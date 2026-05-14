import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";

type Product = {
  id: number;
  name: string;
  price: string;
  stock_qty: number;
  category_type: string;
};

export default function ProductsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Product[]>([]);
  const canEdit = user?.role === "admin" || user?.role === "manager";
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const { data } = await api.get<Product[]>("/products/");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load().catch(() => setErr("Yuklanmadi."));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/products/", {
        name,
        price,
        category_type: "other",
        description: "",
      });
      setName("");
      setPrice("");
      await load();
    } catch {
      setErr("Mahsulot qo'shilmadi (narx yoki nom).");
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Mahsulotlar katalogi</h2>
      {canEdit ? (
        <form className="card" onSubmit={add} style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ margin: 0, flex: "1 1 160px" }}>
            <label>Nomi</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field" style={{ margin: 0, width: 140 }}>
            <label>Narx (so&apos;m)</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <button type="submit" className="btn">
            Qo'shish
          </button>
        </form>
      ) : null}
      {err ? <p className="error">{err}</p> : null}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nomi</th>
              <th>Kategoriya</th>
              <th>Narx</th>
              <th>Ombor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.category_type}</td>
                <td>{p.price}</td>
                <td>{p.stock_qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
