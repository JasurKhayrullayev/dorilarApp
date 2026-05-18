import { useEffect, useState } from "react";
import api from "../api/client";
import { fmtDate } from "../utils/helpers";
import { useNotif } from "../auth/NotifContext";

type Notif = {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  channel: string;
  delivery_status: string;
  created_at: string;
};

export default function NotificationsPage() {
  const [rows, setRows]   = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]     = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const { setUnread } = useNotif();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Notif[]>("/notifications/");
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setErr("Bildirishnomalar yuklanmadi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function markRead(id: number) {
    try {
      await api.post(`/notifications/${id}/mark_read/`);
      setRows((prev) => {
        const updated = prev.map((n) => n.id === id ? { ...n, is_read: true } : n);
        setUnread(updated.filter((n) => !n.is_read).length);
        return updated;
      });
    } catch { /* silent */ }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.post("/notifications/mark_all_read/");
      setRows((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {
      setErr("Xato yuz berdi.");
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = rows.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ margin: 0 }}>
            🔔 Bildirishnomalar
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.1rem 0.55rem",
                  borderRadius: "9999px",
                  verticalAlign: "middle",
                }}
              >
                {unreadCount}
              </span>
            )}
          </h2>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="btn ghost"
            onClick={markAllRead}
            disabled={markingAll}
          >
            {markingAll ? "…" : "✓ Barchasini o'qilgan deb belgilash"}
          </button>
        )}
      </div>

      {err && <p className="error">⚠ {err}</p>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>⏳ Yuklanmoqda…</div>
      ) : rows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "#64748b",
            background: "#fff",
            borderRadius: "0.75rem",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎉</div>
          <div>Barcha bildirishnomalar o'qilgan</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((n) => (
            <div
              key={n.id}
              style={{
                background: n.is_read ? "#fff" : "#f0fdf4",
                border: `1px solid ${n.is_read ? "var(--border)" : "#86efac"}`,
                borderRadius: "0.65rem",
                padding: "0.85rem 1rem",
                display: "flex",
                gap: "0.85rem",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: n.is_read ? "#cbd5e1" : "#22c55e",
                  flexShrink: 0,
                  marginTop: "0.35rem",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: n.is_read ? 500 : 700,
                    fontSize: "0.9rem",
                    color: "#0f172a",
                    marginBottom: "0.2rem",
                  }}
                >
                  {n.title}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "0.35rem" }}>
                  {n.body}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  {fmtDate(n.created_at)}
                  {" · "}
                  <span
                    className="badge"
                    style={{
                      background: n.channel === "telegram" ? "#e0f2fe" : "#f1f5f9",
                      color: n.channel === "telegram" ? "#0369a1" : "#475569",
                      fontSize: "0.68rem",
                    }}
                  >
                    {n.channel === "telegram" ? "✈ Telegram" : "🌐 Web"}
                  </span>
                </div>
              </div>
              {!n.is_read && (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: "0.78rem", padding: "0.25rem 0.6rem", flexShrink: 0 }}
                  onClick={() => markRead(n.id)}
                >
                  ✓ O'qildim
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
