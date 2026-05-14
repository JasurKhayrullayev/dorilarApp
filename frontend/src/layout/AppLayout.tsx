import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const nav = [
  { to: "/panel", label: "Boshqaruv", roles: ["admin", "manager", "doctor", "pharmacist", "operator"] },
  { to: "/panel/mijozlar", label: "Mijozlar", roles: ["admin", "manager", "doctor", "pharmacist", "operator"] },
  { to: "/panel/mahsulotlar", label: "Mahsulotlar", roles: ["admin", "manager", "doctor", "pharmacist", "operator"] },
  { to: "/panel/retseptlar", label: "Retseptlar", roles: ["admin", "manager", "doctor", "pharmacist"] },
  { to: "/panel/sotuvlar", label: "Sotuvlar", roles: ["admin", "manager", "doctor", "pharmacist"] },
  { to: "/panel/qongiroqlar", label: "Qo'ng'iroqlar", roles: ["admin", "manager", "operator"] },
  { to: "/panel/aksiyalar", label: "Aksiyalar", roles: ["admin", "manager"] },
  { to: "/panel/ombor", label: "Ombor", roles: ["admin", "manager"] },
  { to: "/panel/foydalanuvchilar", label: "Foydalanuvchilar", roles: ["admin"] },
  { to: "/panel/audit", label: "Audit jurnali", roles: ["admin"] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/kirish" replace />;

  const links = nav.filter((n) => n.roles.includes(user.role));

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
          background: "#0f172a",
          color: "#e2e8f0",
          padding: "1rem 0",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <div style={{ padding: "0 1rem 1rem", borderBottom: "1px solid #334155" }}>
          <strong style={{ color: "#5eead4" }}>BAD Sales CRM</strong>
          <div style={{ fontSize: "0.8rem", marginTop: "0.35rem", opacity: 0.85 }}>
            {user.first_name || user.username}
            <br />
            <span style={{ textTransform: "capitalize" }}>{user.role}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <nav style={{ display: "flex", flexDirection: "column", marginTop: "0.75rem" }}>
            {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/panel"}
              style={({ isActive }) => ({
                padding: "0.55rem 1rem",
                color: isActive ? "#0f172a" : "#cbd5e1",
                background: isActive ? "#5eead4" : "transparent",
                textDecoration: "none",
                fontSize: "0.9rem",
              })}
            >
              {l.label}
            </NavLink>
            ))}
          </nav>
        </div>
        <div style={{ padding: "1rem", marginTop: "auto", borderTop: "1px solid #334155" }}>
          <button type="button" className="btn secondary" style={{ width: "100%" }} onClick={logout}>
            Chiqish
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: "1.5rem", overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
