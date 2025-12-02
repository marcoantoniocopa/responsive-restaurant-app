import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { SettingsProvider } from "./contexts/SettingsContext.tsx";
import { ConfigProvider } from "./contexts/ConfigContext.tsx";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <ConfigProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </ConfigProvider>
  </AuthProvider>
);