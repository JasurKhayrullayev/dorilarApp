import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import api from "../api/client";

type NotifState = {
  unread: number;
  refresh: () => void;
  setUnread: (n: number) => void;
};

const NotifContext = createContext<NotifState>({ unread: 0, refresh: () => {}, setUnread: () => {} });

export function NotifProvider({ children }: { children: ReactNode }) {
  const [unread, setUnread] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<{ unread_notifications?: number }>("/dashboard/");
      setUnread(data.unread_notifications ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    void refresh();
    intervalRef.current = setInterval(refresh, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  const value = useMemo(() => ({ unread, refresh, setUnread }), [unread, refresh]);

  return <NotifContext.Provider value={value}>{children}</NotifContext.Provider>;
}

export function useNotif() {
  return useContext(NotifContext);
}
