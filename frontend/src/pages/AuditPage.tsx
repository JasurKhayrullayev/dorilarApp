import { useEffect, useState } from "react";
import api from "../api/client";

type Log = {
  id: number;
  created_at: string;
  username: string | null;
  action: string;
  object_type: string;
  object_id: string;
};

export default function AuditPage() {
  const [rows, setRows] = useState<Log[]>([]);

  useEffect(() => {
    void api.get<Log[]>("/audit-logs/").then((r) => setRows(Array.isArray(r.data) ? r.data : []));
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Audit jurnali</h2>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vaqt</th>
              <th>Foydalanuvchi</th>
              <th>Harakat</th>
              <th>Obyekt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString("uz-UZ")}</td>
                <td>{l.username || "—"}</td>
                <td>{l.action}</td>
                <td>
                  {l.object_type} #{l.object_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
