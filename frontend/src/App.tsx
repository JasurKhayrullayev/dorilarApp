import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import AppLayout from "./layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import ProductsPage from "./pages/ProductsPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import SalesPage from "./pages/SalesPage";
import CallsPage from "./pages/CallsPage";
import PromotionsPage from "./pages/PromotionsPage";
import InventoryPage from "./pages/InventoryPage";
import UsersPage from "./pages/UsersPage";
import AuditPage from "./pages/AuditPage";
import NotificationsPage from "./pages/NotificationsPage";

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ padding: "2rem" }}>Yuklanmoqda…</p>;
  if (!user) return <Navigate to="/kirish" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/kirish" element={<LoginPage />} />
      <Route
        path="/panel"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="mijozlar" element={<CustomersPage />} />
        <Route path="mahsulotlar" element={<ProductsPage />} />
        <Route path="retseptlar" element={<PrescriptionsPage />} />
        <Route path="sotuvlar" element={<SalesPage />} />
        <Route path="qongiroqlar" element={<CallsPage />} />
        <Route path="aksiyalar" element={<PromotionsPage />} />
        <Route path="ombor" element={<InventoryPage />} />
        <Route path="foydalanuvchilar" element={<UsersPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="bildirishnomalar" element={<NotificationsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/panel" replace />} />
      <Route path="*" element={<Navigate to="/panel" replace />} />
    </Routes>
  );
}
