import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { fmtDate } from "../utils/helpers";

type Customer = {
  id: number;
  full_name: string;
  phones: string[];
  region: string;
  district: string;
  last_call_at?: string | null;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [full_name, setFullName] = useState("");
  const [phones, setPhones] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get<{ results?: Customer[] } | Customer[]>("/customers/");
    const list = Array.isArray(data) ? data : (data as { results?: Customer[] }).results ?? [];
    setRows(list as Customer[]);
  }

  useEffect(() => { void load().catch(() => setErr("Ro'yxat yuklanmadi.")); }, []);

  const regions = useMemo(() => [...new Set(rows.map((c) => c.region).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((c) => {
      const matchName  = c.full_name.toLowerCase().includes(q);
      const matchPhone = (c.phones || []).some((p) => p.includes(q));
      const matchRegion = regionFilter ? c.region === regionFilter : true;
      return (matchName || matchPhone) && matchRegion;
    });
  }, [rows, search, regionFilter]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setSaving(true);
    try {
      await api.post("/customers/", {
        full_name,
        phones: phones.split(",").map((s) => s.trim()).filter(Boolean),
        region,
        district,
      });
      setOpen(false);
      setFullName(""); setPhones(""); setRegion(""); setDistrict("");
      await load();
    } catch {
      setErr("Saqlashda xato (takroriy raqam yoki maydonlar).");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h2>👥 Mijozlar</h2>
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          + Yangi mijoz
        </button>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="🔍 FIO yoki telefon raqami…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {regions.length > 0 && (
          <div className="filter-group">
            <label>Viloyat:</label>
            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
              <option value="">Hammasi</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#64748b" }}>
          {filtered.length} / {rows.length} ta mijoz
        </span>
      </div>

      {err && <p className="error">⚠ {err}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>FIO</th>
              <th>Telefonlar</th>
              <th>Hudud</th>
              <th>Oxirgi qo'ng'iroq</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>Mijoz topilmadi</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{c.id}</td>
                <td style={{ fontWeight: 500 }}>{c.full_name}</td>
                <td>
                  {(c.phones || []).map((p, i) => (
                    <a key={i} href={`tel:${p}`} style={{ display: "block", color: "#0d9488", fontSize: "0.875rem" }}>
                      📞 {p}
                    </a>
                  ))}
                </td>
                <td style={{ fontSize: "0.875rem" }}>
                  {[c.region, c.district].filter(Boolean).join(", ") || "—"}
                </td>
                <td style={{ fontSize: "0.82rem", color: "#64748b" }}>
                  {fmtDate(c.last_call_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box">
            <h3>Yangi mijoz qo'shish</h3>
            <form onSubmit={create}>
              <div className="field">
                <label>FIO *</label>
                <input value={full_name} onChange={(e) => setFullName(e.target.value)} required autoFocus placeholder="Aliyev Vohid Xamidovich" />
              </div>
              <div className="field">
                <label>Telefonlar (vergul bilan) *</label>
                <input value={phones} onChange={(e) => setPhones(e.target.value)} required placeholder="+998901234567, +998711234567" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="field">
                  <label>Viloyat</label>
                  <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Toshkent" />
                </div>
                <div className="field">
                  <label>Tuman</label>
                  <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Yunusobod" />
                </div>
              </div>
              {err && <p className="error">⚠ {err}</p>}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                <button type="submit" className="btn" disabled={saving}>{saving ? "Saqlanmoqda…" : "Saqlash"}</button>
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>Bekor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
