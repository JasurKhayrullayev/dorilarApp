import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("demo123");
  const [err, setErr] = useState("");

  if (!loading && user) return <Navigate to="/panel" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await login(username, password);
      nav("/panel");
    } catch {
      setErr("Login yoki parol noto'g'ri yoki hisob bloklangan.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(160deg, #0f766e 0%, #0f172a 55%)",
        padding: "1rem",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.35rem" }}>BAD Sales CRM</h1>
        <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.9rem" }}>
          Biologik faol qo&apos;shimchalar sotish boshqaruvi
        </p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="u">Login</label>
            <input
              id="u"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="p">Parol</label>
            <input
              id="p"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {err ? <p className="error">{err}</p> : null}
          <button type="submit" className="btn" style={{ width: "100%", marginTop: "0.5rem" }} disabled={loading}>
            {loading ? "…" : "Kirish"}
          </button>
        </form>
        <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "1rem" }}>
          Demo: admin / demo123 (yoki vrach, aptekachi, operator, menejer)
        </p>
      </div>
    </div>
  );
}
