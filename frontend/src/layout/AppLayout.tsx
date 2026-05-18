import { useEffect, useState } from "react";
import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";

const NAV = [
  { to: "/panel",              label: "🏠 Boshqaruv",       roles: ["admin","manager","doctor","pharmacist","operator"], end: true },
  { to: "/panel/mijozlar",     label: "👥 Mijozlar",         roles: ["admin","manager","doctor","pharmacist","operator"] },
  { to: "/panel/mahsulotlar",  label: "💊 Mahsulotlar",      roles: ["admin","manager","doctor","pharmacist","operator"] },
  { to: "/panel/retseptlar",   label: "📋 Retseptlar",       roles: ["admin","manager","doctor","pharmacist"] },
  { to: "/panel/sotuvlar",     label: "🛒 Sotuvlar",         roles: ["admin","manager","doctor","pharmacist"] },
  { to: "/panel/qongiroqlar",  label: "📞 Qo'ng'iroqlar",   roles: ["admin","manager","operator"] },
  { to: "/panel/aksiyalar",    label: "🎁 Aksiyalar",        roles: ["admin","manager"] },
  { to: "/panel/ombor",        label: "📦 Ombor",            roles: ["admin","manager"] },
  { to: "/panel/bildirishnomalar", label: "🔔 Bildirishnomalar", roles: ["admin","manager","doctor","pharmacist","operator"] },
  { to: "/panel/foydalanuvchilar", label: "⚙️ Foydalanuvchilar", roles: ["admin"] },
  { to: "/panel/audit",        label: "🔍 Audit jurnali",    roles: ["admin"] },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator", manager: "Menejer",
  doctor: "Vrach", pharmacist: "Aptekachi", operator: "Operator",
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function fetchUnread() {
      try {
        const { data } = await api.get<{ unread_notifications?: number }>("/dashboard/");
        setUnread(data.unread_notifications ?? 0);
      } catch { /* silent */ }
    }

    void fetchUnread();
    interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return <Navigate to="/kirish" replace />;

  const links = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <strong>BAD Sales CRM</strong>
            <span
              className="notif-bell"
              title={unread > 0 ? `${unread} ta o'qilmagan bildirishnoma` : "Bildirishnomalar"}
              style={{ color: "#94a3b8", fontSize: "1.1rem" }}
              onClick={() => navigate("/panel/bildirishnomalar")}
            >
              🔔
              {unread > 0 && (
                <span className="notif-count">{unread > 99 ? "99+" : unread}</span>
              )}
            </span>
          </div>
          <div className="sidebar-user">
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
              {user.first_name || user.username}
            </span>
            <br />
            <span style={{ fontSize: "0.72rem" }}>
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="btn secondary" style={{ width: "100%", fontSize: "0.82rem" }} onClick={logout}>
            ↩ Chiqish
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
