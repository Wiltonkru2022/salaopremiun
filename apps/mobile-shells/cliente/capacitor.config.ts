import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.salaopremiun.cliente",
  appName: "Salão Premium Cliente",
  webDir: "www",
  server: {
    url: "https://app.salaopremiun.com.br/app-cliente/",
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
