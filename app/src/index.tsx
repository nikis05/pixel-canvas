import "@telegram-apps/telegram-ui/dist/styles.css";
import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import { EnvUnsupported } from "@/components/EnvUnsupported.tsx";
import { init as initMiniApp } from "@/initMiniApp.ts";
import "./mockEnv.ts";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { publicUrl } from "./utils/publicUrl.ts";
import { App } from "./App.tsx";
import "./index.css";
import { captureException, init as initSentry } from "@sentry/react";
import telegramAnalytics from "@telegram-apps/analytics";

function loadEnvVar(name: string) {
  const value = import.meta.env[name] as string | undefined;
  if (value === undefined) throw new Error(`Missing ${name} env variable`);
  return value;
}

export const STORE_ADDRESS = loadEnvVar("VITE_STORE_ADDRESS");
export const API_URL = loadEnvVar("VITE_API_URL");
export const RENDER_URL = loadEnvVar("VITE_RENDER_URL");
export const TG_ANALYTICS_IDENTIFIER = import.meta.env[
  "VITE_TG_ANALYTICS_IDENTIFIER"
] as string | undefined;
export const TG_ANALYTICS_TOKEN = import.meta.env["VITE_TG_ANALYTICS_TOKEN"] as
  | string
  | undefined;

initSentry({
  dsn: "https://41577d78bcef62be195e4796d03840ac@o4504381711056896.ingest.us.sentry.io/4510161823596544",
  sendDefaultPii: true,
});

const root = ReactDOM.createRoot(document.getElementById("root")!);

try {
  initMiniApp();

  if (TG_ANALYTICS_IDENTIFIER != undefined && TG_ANALYTICS_TOKEN != undefined) {
    telegramAnalytics
      .init({
        appName: TG_ANALYTICS_IDENTIFIER,
        token: TG_ANALYTICS_TOKEN,
      })
      .catch(captureException);
  }

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <TonConnectUIProvider
          manifestUrl={
            (import.meta.env.VITE_TC_MANIFEST_URL as string | undefined) ??
            publicUrl("tonconnect-manifest.json")
          }
        >
          <App />
        </TonConnectUIProvider>
      </ErrorBoundary>
    </StrictMode>
  );
  console.log("Initial render complete");
} catch (e) {
  console.log(e);
  root.render(<EnvUnsupported />);
}
