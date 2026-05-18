import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { NotifProvider } from "./auth/NotifContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotifProvider>
          <App />
        </NotifProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
