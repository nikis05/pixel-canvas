import { retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { AppRoot, Spinner } from "@telegram-apps/telegram-ui";
import { FC, useEffect, useMemo, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { routes } from "./routes";
import { Nav } from "./components/Nav";
import { TosModal } from "./components/TosModal";
import { useIsMounted } from "usehooks-ts";
import { initEditor } from "./initEditor";
import { Editor } from "./model/editor";
import { EditorProvider } from "./model/editor/useEditor";
import { getDeviceStorageKey } from "./utils/deviceStorage";

export const TOS_STORAGE_KEY = "@pixel-canvas/tos";
export const EDITOR_STORAGE_KEY = "@pixel-canvas/editor";

export const App: FC = () => {
  const lp = useMemo(() => retrieveLaunchParams(), []);

  const isMounted = useIsMounted();

  const [storageData, setStorageData] = useState<
    | { available: false }
    | {
        available: true;
        acceptedTosVersion: string | null;
        editorData: string | null;
      }
    | null
  >(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const version = localStorage.getItem(TOS_STORAGE_KEY);
      const editorData = localStorage.getItem(EDITOR_STORAGE_KEY);
      setStorageData({
        available: true,
        acceptedTosVersion: version,
        editorData,
      });
    } else {
      Promise.all([
        getDeviceStorageKey(TOS_STORAGE_KEY),
        getDeviceStorageKey(EDITOR_STORAGE_KEY),
      ])
        .then(([version, editorData]) => {
          if (isMounted())
            setStorageData({
              available: true,
              acceptedTosVersion: version,
              editorData: editorData,
            });
        })
        .catch(() => {
          if (isMounted()) setStorageData({ available: false });
        });
    }
  }, [setStorageData, isMounted]);

  const editor = useMemo<Editor | null>(() => {
    if (storageData == null) return null;
    const editor = initEditor(
      storageData.available ? storageData.editorData : null
    );
    return editor;
  }, [storageData]);

  return (
    <AppRoot
      appearance="dark"
      platform={["macos", "ios"].includes(lp.tgWebAppPlatform) ? "ios" : "base"}
    >
      {storageData != null && editor != null ? (
        <>
          <HashRouter>
            <EditorProvider editor={editor}>
              <Nav>
                <Routes>
                  {routes.map((route) => (
                    <Route key={route.path} {...route} />
                  ))}
                  <Route path="*" element={<Navigate to="/editor" />} />
                </Routes>
              </Nav>
            </EditorProvider>
          </HashRouter>
          <TosModal
            acceptedTosVersion={
              storageData.available
                ? {
                    available: true,
                    version: storageData.acceptedTosVersion,
                  }
                : { available: false }
            }
          />
        </>
      ) : (
        <div className="pt-5 flex justify-center items-center">
          <Spinner size="l" />
        </div>
      )}
    </AppRoot>
  );
};
