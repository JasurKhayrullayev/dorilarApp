import { useEffect, useState } from "react";
import api from "../api/client";

type Call = {
  id: number;
  customer: number;
  result: string;
  notes: string;
  created_at: string;
};

const RESULTS = [
  { v: "to_doctor", l: "Vrachga yo'naltirildi" },
  { v: "repeat_rx", l: "Takroriy retsept" },
  { v: "callback", l: "Qayta qo'ng'iroq" },
  { v: "refused", l: "Rad etdi" },
  { v: "no_answer", l: "Javob bermadi" },
  { v: "wrong_number", l: "Raqam noto'g'ri" },
];

export default function CallsPage() {
  const [rows, setRows] = useState<Call[]>([]);
  const [customers, setCustomers] = useState<{ id: number; full_name: string }[]>([]);
  const [customer, setCustomer] = useState<number | "">("");
  const [result, setResult] = useState("to_doctor");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const c = await api.get("/customers/");
    setCustomers(Array.isArray(c.data) ? c.data : []);
    const r = await api.get<Call[]>("/calls/");
    setRows(Array.isArray(r.data) ? r.data : []);
  }

  useEffect(() => {
    void load().catch(() => setErr("Yuklanmadi."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/calls/", { customer, result, notes });
      setNotes("");
      await load();
    } catch {
      setErr("Qo'ng'iroq saqlanmadi.");
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Qo&apos;ng&apos;iroqlar</h2>
      <form className="card" onSubmit={submit} style={{ marginBottom: "1rem", maxWidth: 520 }}>
        <h3 style={{ marginTop: 0 }}>Yangi yozuv</h3>
        <div className="field">
          <label>Mijoz</label>
          <select value={customer} onChange={(e) => setCustomer(Number(e.target.value))} required>
            <option value="">—</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Natija</label>
          <select value={result} onChange={(e) => setResult(e.target.value)}>
            {RESULTS.map((x) => (
              <option key={x.v} value={x.v}>
                {x.l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Izoh</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <button type="submit" className="btn">
          Saqlash
        </button>
        {err ? <p className="error">{err}</p> : null}
      </form>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Mijoz ID</th>
              <th>Natija</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.customer}</td>
                <td>{r.result}</td>
                <td>{new Date(r.created_at).toLocaleString("uz-UZ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
