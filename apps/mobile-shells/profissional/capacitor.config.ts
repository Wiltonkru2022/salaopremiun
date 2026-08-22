import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.salaopremiun.profissional",
  appName: "Salão Premiun Profissional",
  webDir: "www",
  server: {
    url: "https://app.salaopremiun.com.br/app-profissional/",
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
