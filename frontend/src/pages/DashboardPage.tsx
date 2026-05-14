import { useEffect, useState } from "react";
import api from "../api/client";

type Dash = {
  today_sales_count: number;
  today_sales_sum: string | number;
  open_prescriptions: number;
  customers_total: number;
  low_stock_products: number;
};

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get<Dash>("/dashboard/")
      .then((r) => setD(r.data))
      .catch(() => setErr("Ma'lumot yuklanmadi."));
  }, []);

  if (err) return <p className="error">{err}</p>;
  if (!d) return <p>Yuklanmoqda…</p>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Boshqaruv paneli</h2>
      <p style={{ color: "#64748b" }}>Bugungi sotuvlar, retseptlar va ombor qisqacha ko&apos;rinishi.</p>
      <div className="grid-stats" style={{ marginTop: "1rem" }}>
        <div className="stat">
          <strong>{d.today_sales_count}</strong>
          <span>Bugungi sotuvlar (soni)</span>
        </div>
        <div className="stat">
          <strong>{String(d.today_sales_sum)}</strong>
          <span>Bugungi summa (so&apos;m)</span>
        </div>
        <div className="stat">
          <strong>{d.open_prescriptions}</strong>
          <span>Ochiq retseptlar</span>
        </div>
        <div className="stat">
          <strong>{d.customers_total}</strong>
          <span>Mijozlar bazasi</span>
        </div>
        <div className="stat">
          <strong>{d.low_stock_products}</strong>
          <span>Past qoldiq mahsulotlar</span>
        </div>
      </div>
    </div>
  );
}
