import { useEffect, useState } from "react";
import api from "../api/client";
import { fmtSum } from "../utils/helpers";

type Dash = {
  today_sales_count: number;
  today_sales_sum: string | number;
  open_prescriptions: number;
  customers_total: number;
  low_stock_products: number;
  expiring_soon_products?: number;
  unread_notifications?: number;
};

const STATS = [
  {
    key: "today_sales_count" as keyof Dash,
    label: "Bugungi sotuvlar",
    icon: "🛒",
    format: (v: string | number) => String(v),
    cls: "",
  },
  {
    key: "today_sales_sum" as keyof Dash,
    label: "Bugungi tushum (so'm)",
    icon: "💰",
    format: (v: string | number) => fmtSum(v, false),
    cls: "",
  },
  {
    key: "open_prescriptions" as keyof Dash,
    label: "Ochiq retseptlar",
    icon: "📋",
    format: (v: string | number) => String(v),
    cls: "",
  },
  {
    key: "customers_total" as keyof Dash,
    label: "Mijozlar bazasi",
    icon: "👥",
    format: (v: string | number) => String(v),
    cls: "info",
  },
  {
    key: "low_stock_products" as keyof Dash,
    label: "Kam qoldiqli mahsulotlar",
    icon: "⚠️",
    format: (v: string | number) => String(v),
    cls: "warn",
  },
  {
    key: "expiring_soon_products" as keyof Dash,
    label: "30 kun ichida muddati tugadi",
    icon: "⏰",
    format: (v: string | number) => String(v ?? 0),
    cls: "danger",
  },
  {
    key: "unread_notifications" as keyof Dash,
    label: "O'qilmagan bildirishnomalar",
    icon: "🔔",
    format: (v: string | number) => String(v ?? 0),
    cls: "",
  },
];

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get<Dash>("/dashboard/")
      .then((r) => setD(r.data))
      .catch(() => setErr("Ma'lumot yuklanmadi."));
  }, []);

  const today = new Date().toLocaleDateString("uz-UZ", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "0.5rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>Boshqaruv paneli</h2>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0", fontSize: "0.875rem" }}>{today}</p>
        </div>
      </div>

      {err ? <p className="error">⚠ {err}</p> : null}

      {!d ? (
        <div style={{ color: "#64748b", marginTop: "2rem", textAlign: "center" }}>
          <span style={{ fontSize: "2rem" }}>⏳</span>
          <p>Yuklanmoqda…</p>
        </div>
      ) : (
        <>
          <div className="grid-stats">
            {STATS.map((s) => {
              const val = d[s.key];
              const numVal = Number(val ?? 0);
              const isDanger = (s.key === "low_stock_products" || s.key === "expiring_soon_products") && numVal > 0;
              return (
                <div key={s.key} className={`stat ${isDanger ? s.cls : ""}`}>
                  <span className="stat-icon">{s.icon}</span>
                  <strong>{s.format(val ?? 0)}</strong>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>

          {(d.low_stock_products ?? 0) > 0 || (d.expiring_soon_products ?? 0) > 0 ? (
            <div
              style={{
                marginTop: "1.25rem",
                padding: "0.85rem 1rem",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "0.65rem",
                fontSize: "0.875rem",
                color: "#92400e",
                display: "flex",
                flexWrap: "wrap",
                gap: "1.5rem",
              }}
            >
              {(d.low_stock_products ?? 0) > 0 && (
                <span>⚠ <strong>{d.low_stock_products}</strong> ta mahsulot omborda minimal qoldiqdan past</span>
              )}
              {(d.expiring_soon_products ?? 0) > 0 && (
                <span>⏰ <strong>{d.expiring_soon_products}</strong> ta mahsulot 30 kun ichida muddati tugaydi</span>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
