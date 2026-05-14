import { useEffect, useState } from "react";
import api from "../api/client";

type Promo = {
  id: number;
  name: string;
  promo_type: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

export default function PromotionsPage() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [name, setName] = useState("Yozgi chegirma");
  const [percent, setPercent] = useState("10");
  const [err, setErr] = useState("");

  async function load() {
    const { data } = await api.get<Promo[]>("/promotions/");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load().catch(() => setErr("Yuklanmadi."));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const starts = new Date();
    const ends = new Date(starts.getTime() + 30 * 24 * 3600 * 1000);
    try {
      await api.post("/promotions/", {
        name,
        promo_type: "percent",
        percent,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        is_active: true,
      });
      await load();
    } catch {
      setErr("Aksiya yaratilmadi.");
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Aksiyalar</h2>
      <form className="card" onSubmit={add} style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field" style={{ margin: 0, flex: "1 1 200px" }}>
          <label>Nomi</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field" style={{ margin: 0, width: 120 }}>
          <label>Foiz</label>
          <input value={percent} onChange={(e) => setPercent(e.target.value)} />
        </div>
        <button type="submit" className="btn">
          Qo'shish (30 kun)
        </button>
      </form>
      {err ? <p className="error">{err}</p> : null}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nomi</th>
              <th>Turi</th>
              <th>Boshlanish</th>
              <th>Tugash</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.promo_type}</td>
                <td>{new Date(p.starts_at).toLocaleDateString("uz-UZ")}</td>
                <td>{new Date(p.ends_at).toLocaleDateString("uz-UZ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
