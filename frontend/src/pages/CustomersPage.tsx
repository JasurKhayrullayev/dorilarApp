import { useEffect, useState } from "react";
import api from "../api/client";

type Customer = {
  id: number;
  full_name: string;
  phones: string[];
  region: string;
  district: string;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [full_name, setFullName] = useState("");
  const [phones, setPhones] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const { data } = await api.get<{ results?: Customer[] } | Customer[]>("/customers/");
    const list = Array.isArray(data) ? data : data.results ?? [];
    setRows(list as Customer[]);
  }

  useEffect(() => {
    void load().catch(() => setErr("Ro'yxat yuklanmadi."));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/customers/", {
        full_name,
        phones: phones.split(",").map((s) => s.trim()).filter(Boolean),
        region,
        district,
      });
      setOpen(false);
      setFullName("");
      setPhones("");
      await load();
    } catch {
      setErr("Saqlashda xato (takroriy raqam yoki maydonlar).");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Mijozlar</h2>
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          Yangi mijoz
        </button>
      </div>
      {err ? <p className="error">{err}</p> : null}
      <div className="card table-wrap" style={{ marginTop: "1rem" }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>FIO</th>
              <th>Telefonlar</th>
              <th>Hudud</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.full_name}</td>
                <td>{(c.phones || []).join(", ")}</td>
                <td>
                  {c.region} {c.district}
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
          }}
        >
          <div className="card" style={{ width: "min(480px, 100%)" }}>
            <h3 style={{ marginTop: 0 }}>Yangi mijoz</h3>
            <form onSubmit={create}>
              <div className="field">
                <label>FIO</label>
                <input value={full_name} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Telefonlar (vergul bilan)</label>
                <input value={phones} onChange={(e) => setPhones(e.target.value)} required />
              </div>
              <div className="field">
                <label>Viloyat</label>
                <input value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div className="field">
                <label>Tuman</label>
                <input value={district} onChange={(e) => setDistrict(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn">
                  Saqlash
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
