import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { initializeNativeApiTransport } from "./lib/native-api";
import "./styles.css";

void initializeNativeApiTransport().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
});
