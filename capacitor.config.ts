import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.arissolar.crm",
  appName: "Aris Solar CRM",
  webDir: "dist/client",
  server: {
    url: "https://arissolar-crm.vercel.app",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
