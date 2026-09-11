import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.salaopremiun.profissional",
  appName: "Salão Premiun Profissional",
  webDir: "www",
  server: {
    // Os arquivos compilados do Vite ficam dentro do APK. Nunca apontar esta
    // configuração para o site, pois isso transforma o aplicativo em navegador.
    androidScheme: "https",
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
