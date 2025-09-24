import "@telegram-apps/telegram-ui/dist/styles.css";
import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import { retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { EnvUnsupported } from "@/components/EnvUnsupported.tsx";
import { init as initMiniApp } from "@/initMiniApp.ts";
import "./mockEnv.ts";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { publicUrl } from "./utils/publicUrl.ts";
import { App } from "./App.tsx";
import "./index.css";
import { Editor } from "./model/editor/index.ts";
import { initEditor } from "./initEditor.ts";
import { EditorProvider } from "./model/editor/useEditor.tsx";
import { popup } from "@telegram-apps/sdk-react";

const root = ReactDOM.createRoot(document.getElementById("root")!);
const editor = initEditor();

try {
  await initMiniApp().then(() => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <TonConnectUIProvider
            manifestUrl={
              import.meta.env.VITE_TC_MANIFEST_URL ||
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
  });
} catch (e) {
  root.render(<EnvUnsupported />);
}
