import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/globals.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { SocketProvider } from "./contexts/SocketContext.tsx";
import { SettingsProvider } from "./contexts/SettingsContext.tsx";
import { ConfigProvider } from "./contexts/ConfigContext.tsx";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <SocketProvider>
      <ConfigProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </ConfigProvider>
    </SocketProvider>
  </AuthProvider>
);