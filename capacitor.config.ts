import type { CapacitorConfig } from "@capacitor/cli";

const PROD_URL = "https://geumdan-app.vercel.app";

const config: CapacitorConfig = {
  appId: "com.geumdan.app",
  appName: "검단앱",
  webDir: "out",

  // Option A: 서버 URL 방식 — WebView가 Vercel 앱을 로드
  server: {
    url: PROD_URL,
    cleartext: false,
    androidScheme: "https",
  },

  android: {
    allowMixedContent: false,
    backgroundColor: "#f5f5f7",
  },

  ios: {
    contentInset: "automatic",
    backgroundColor: "#f5f5f7",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#f5f5f7",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "Default",
      backgroundColor: "#f5f5f7",
    },
  },
};

export default config;
