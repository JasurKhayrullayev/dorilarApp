import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { fmtDate, statusInfo } from "../utils/helpers";

type Promo = {
  id: number;
  name: string;
  promo_type: string;
  percent?: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const TYPES = [
  { v: "percent",      l: "Foizli chegirma" },
  { v: "one_plus_one", l: "1+1 (bittasi bepul)" },
  { v: "bundle",       l: "To'plam narxi" },
  { v: "loyal",        l: "Takroriy xaridor" },
];

function todayISO() { return new Date().toISOString().slice(0, 16); }
function daysLater(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 16);
}

export default function PromotionsPage() {
  const [rows, setRows]       = useState<Promo[]>([]);
  const [open, setOpen]       = useState(false);
  const [name, setName]       = useState("");
  const [promoType, setType]  = useState("percent");
  const [percent, setPercent] = useState("10");
  const [startsAt, setStarts] = useState(todayISO);
  const [endsAt, setEnds]     = useState(() => daysLater(30));
  const [err, setErr]         = useState("");
  const [saving, setSaving]   = useState(false);

  // Filter
  const [showActive, setShowActive] = useState("");

  async function load() {
    const { data } = await api.get<Promo[]>("/promotions/");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => { void load().catch(() => setErr("Yuklanmadi.")); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setSaving(true);
    try {
      await api.post("/promotions/", {
        name,
        promo_type: promoType,
        percent: promoType === "percent" || promoType === "loyal" ? percent : null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at:   new Date(endsAt).toISOString(),
        is_active: true,
      });
      setOpen(false);
      setName(""); setPercent("10"); setStarts(todayISO()); setEnds(daysLater(30));
      await load();
    } catch {
      setErr("Aksiya yaratilmadi.");
    } finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    const now = new Date();
    return rows.filter((p) => {
      if (showActive === "active")   return p.is_active && new Date(p.ends_at) >= now;
      if (showActive === "expired")  return new Date(p.ends_at) < now;
      if (showActive === "inactive") return !p.is_active;
      return true;
    });
  }, [rows, showActive]);

  return (
    <div>
      <div className="page-header">
        <h2>🎁 Aksiyalar</h2>
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          + Yangi aksiya
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Ko'rinish:</label>
          <select value={showActive} onChange={(e) => setShowActive(e.target.value)}>
            <option value="">Hammasi</option>
            <option value="active">✓ Faol</option>
            <option value="expired">✗ Muddati o'tgan</option>
            <option value="inactive">Nofaol</option>
          </select>
        </div>
        <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#64748b" }}>
          {filtered.length} ta aksiya
        </span>
      </div>

      {err && !open && <p className="error">⚠ {err}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nomi</th>
              <th>Turi</th>
              <th>Foiz</th>
              <th>Boshlanish</th>
              <th>Tugash</th>
              <th>Holat</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>Aksiya topilmadi</td></tr>
            )}
            {filtered.map((p) => {
              const st = statusInfo(p.promo_type);
              const now = new Date();
              const expired = new Date(p.ends_at) < now;
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>
                    <span className="badge" style={{ background: st.color + "22", color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ color: "#0d9488", fontWeight: 600 }}>
                    {p.percent ? `${p.percent}%` : "—"}
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "#64748b" }}>{fmtDate(p.starts_at, false)}</td>
                  <td style={{ fontSize: "0.82rem", color: expired ? "#dc2626" : "#64748b" }}>
                    {fmtDate(p.ends_at, false)}
                    {expired && <span style={{ marginLeft: "0.35rem", fontSize: "0.72rem" }}>✗ O'tdi</span>}
                  </td>
                  <td>
                    {p.is_active && !expired
                      ? <span className="badge badge-sold">✓ Faol</span>
                      : <span className="badge badge-cancelled">{expired ? "O'tgan" : "Nofaol"}</span>
                    }
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
            <h3>Yangi aksiya yaratish</h3>
            <form onSubmit={add}>
              <div className="field">
                <label>Aksiya nomi *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Yozgi chegirma" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="field">
                  <label>Aksiya turi</label>
                  <select value={promoType} onChange={(e) => setType(e.target.value)}>
                    {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                {(promoType === "percent" || promoType === "loyal") && (
                  <div className="field">
                    <label>Chegirma foizi (%)</label>
                    <input type="number" min={0.1} max={100} step="0.1" value={percent} onChange={(e) => setPercent(e.target.value)} />
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="field">
                  <label>Boshlanish *</label>
                  <input type="datetime-local" value={startsAt} onChange={(e) => setStarts(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Tugash *</label>
                  <input type="datetime-local" value={endsAt} onChange={(e) => setEnds(e.target.value)} required />
                </div>
              </div>

              {promoType === "one_plus_one" && (
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.75rem", padding: "0.6rem", background: "#f1f5f9", borderRadius: 6 }}>
                  ℹ Har 2 ta mahsulot sotib olganda bitta bepul beriladi
                </p>
              )}
              {promoType === "loyal" && (
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.75rem", padding: "0.6rem", background: "#f1f5f9", borderRadius: 6 }}>
                  ℹ Oldingi sotuvlari bor mijozlarga chegirma qo'llanadi
                </p>
              )}

              {err && <p className="error">⚠ {err}</p>}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                <button type="submit" className="btn" disabled={saving}>{saving ? "Saqlanmoqda…" : "✓ Yaratish"}</button>
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>Bekor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
