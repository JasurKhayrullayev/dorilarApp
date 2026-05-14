import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../api/client";

export type Role = "admin" | "manager" | "doctor" | "pharmacist" | "operator";

export type UserMe = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  phone: string;
};

type AuthState = {
  user: UserMe | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("access");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<UserMe>("/me/");
      setUser(data);
    } catch {
      setUser(null);
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post<{ access: string; refresh: string }>("/token/", {
      username,
      password,
    });
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    const me = await api.get<UserMe>("/me/");
    setUser(me.data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth tashqarisida");
  return ctx;
}
