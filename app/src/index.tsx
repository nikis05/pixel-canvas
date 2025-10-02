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

const root = ReactDOM.createRoot(document.getElementById("root")!);
const editor = initEditor();

function loadEnvVar(name: string) {
  const value = import.meta.env[name] as string | undefined;
  if (!value) throw new Error(`Missing ${name} env variable`);
  return value;
}

export const STORE_ADDRESS = loadEnvVar("VITE_STORE_ADDRESS");
export const API_URL = loadEnvVar("VITE_API_URL");

try {
  initMiniApp();

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <TonConnectUIProvider
          manifestUrl={
            (import.meta.env.VITE_TC_MANIFEST_URL as string | undefined) ||
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
} catch (e) {
  console.log(e);
  root.render(<EnvUnsupported />);
}
