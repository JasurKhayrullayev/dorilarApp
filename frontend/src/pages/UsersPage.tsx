import { useEffect, useState } from "react";
import api from "../api/client";
import type { Role } from "../auth/AuthContext";

type U = {
  id: number;
  username: string;
  role: Role;
  first_name: string;
};

export default function UsersPage() {
  const [rows, setRows] = useState<U[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("demo123");
  const [role, setRole] = useState<Role>("operator");
  const [err, setErr] = useState("");

  async function load() {
    const { data } = await api.get<U[]>("/users/");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load().catch(() => setErr("Yuklanmadi."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/users/", { username, password, role, email: `${username}@local` });
      setUsername("");
      await load();
    } catch {
      setErr("Foydalanuvchi yaratilmadi.");
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Foydalanuvchilar</h2>
      <form className="card" onSubmit={submit} style={{ marginBottom: "1rem", maxWidth: 520 }}>
        <h3 style={{ marginTop: 0 }}>Yangi foydalanuvchi</h3>
        <div className="field">
          <label>Login</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="field">
          <label>Parol</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="field">
          <label>Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="admin">admin</option>
            <option value="manager">manager</option>
            <option value="doctor">doctor</option>
            <option value="pharmacist">pharmacist</option>
            <option value="operator">operator</option>
          </select>
        </div>
        <button type="submit" className="btn">
          Yaratish
        </button>
        {err ? <p className="error">{err}</p> : null}
      </form>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Login</th>
              <th>Rol</th>
              <th>Ism</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{u.first_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
