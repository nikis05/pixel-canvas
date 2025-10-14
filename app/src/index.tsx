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
import { initEditor } from "./initEditor.ts";
import { EditorProvider } from "./model/editor/useEditor.tsx";
import { captureException, init as initSentry } from "@sentry/react";
import { getCloudStorageItem } from "@telegram-apps/sdk-react";

function loadEnvVar(name: string) {
  const value = import.meta.env[name] as string | undefined;
  if (value === undefined) throw new Error(`Missing ${name} env variable`);
  return value;
}

export const STORE_ADDRESS = loadEnvVar("VITE_STORE_ADDRESS");
export const API_URL = loadEnvVar("VITE_API_URL");
export const RENDER_URL = loadEnvVar("VITE_RENDER_URL");
export const TOS_STORAGE_KEY = "@pixel-canvas/tos";
export const TOS_VERSION = "1";
export let ACCEPTED_TOS_VERSION: string | null;

async function main() {
  initSentry({
    dsn: "https://41577d78bcef62be195e4796d03840ac@o4504381711056896.ingest.us.sentry.io/4510161823596544",
    sendDefaultPii: true,
  });

  const root = ReactDOM.createRoot(document.getElementById("root")!);

  try {
    initMiniApp();

    const isCloudStorageAvail = getCloudStorageItem.isAvailable();

    console.log("Cloud storage support: ", getCloudStorageItem.isSupported());
    console.log("Cloud storage availability: ", isCloudStorageAvail);

    const editor = await initEditor(isCloudStorageAvail);

    ACCEPTED_TOS_VERSION = import.meta.env.DEV
      ? (localStorage.getItem(TOS_STORAGE_KEY) ?? "")
      : isCloudStorageAvail
        ? await getCloudStorageItem(TOS_STORAGE_KEY)
        : null;

    console.log("");

    root.render(
      <StrictMode>
        <ErrorBoundary>
          <TonConnectUIProvider
            manifestUrl={
              (import.meta.env.VITE_TC_MANIFEST_URL as string | undefined) ??
              publicUrl("tonconnect-manifest.json")
            }
          >
            <EditorProvider editor={editor}>
              <App />
            </EditorProvider>
          </TonConnectUIProvider>
        </ErrorBoundary>
      </StrictMode>
    );
    console.log("Initial render complete");
  } catch (e) {
    console.log(e);
    root.render(<EnvUnsupported />);
  }
}

main().catch(captureException);
