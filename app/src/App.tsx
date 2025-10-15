import {
  getCloudStorageItem,
  retrieveLaunchParams,
} from "@telegram-apps/sdk-react";
import { AppRoot, Spinner } from "@telegram-apps/telegram-ui";
import { FC, useEffect, useMemo, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { routes } from "./routes";
import { Nav } from "./components/Nav";
import { TosModal } from "./components/TosModal";
import { useIsMounted } from "usehooks-ts";
import { captureException } from "@sentry/react";
import { initEditor } from "./initEditor";
import { Editor } from "./model/editor";
import { EditorProvider } from "./model/editor/useEditor";

export const TOS_STORAGE_KEY = "@pixel-canvas/tos";
export const EDITOR_STORAGE_KEY = "@pixel-canvas/editor";

export const App: FC = () => {
  const lp = useMemo(() => retrieveLaunchParams(), []);

  const isCloudStorageAvailable = getCloudStorageItem.isAvailable();

  const isMounted = useIsMounted();

  const [cloudStorageData, setCloudStorageData] = useState<
    | { available: false }
    | { available: true; acceptedTosVersion: string; editorData: string | null }
    | null
  >(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const version = localStorage.getItem(TOS_STORAGE_KEY);
      const editorData = localStorage.getItem(EDITOR_STORAGE_KEY);
      setCloudStorageData({
        available: true,
        acceptedTosVersion: version ?? "",
        editorData,
      });
    } else if (isCloudStorageAvailable) {
      Promise.all([
        getCloudStorageItem(TOS_STORAGE_KEY, { timeout: 2000 }),
        getCloudStorageItem(EDITOR_STORAGE_KEY, { timeout: 2000 }),
      ])
        .then(([version, editorData]) => {
          if (isMounted())
            setCloudStorageData({
              available: true,
              acceptedTosVersion: version,
              editorData: editorData === "" ? null : editorData,
            });
        })
        .catch(captureException);
    } else {
      setCloudStorageData({ available: false });
    }
  }, [setCloudStorageData, isCloudStorageAvailable, isMounted]);

  const editor = useMemo<Editor | null>(() => {
    if (cloudStorageData == null) return null;
    const editor = initEditor(
      cloudStorageData.available ? cloudStorageData.editorData : null
    );
    return editor;
  }, [cloudStorageData]);

  return (
    <AppRoot
      appearance="dark"
      platform={["macos", "ios"].includes(lp.tgWebAppPlatform) ? "ios" : "base"}
    >
      {cloudStorageData != null && editor != null ? (
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
              cloudStorageData.available
                ? {
                    available: true,
                    version: cloudStorageData.acceptedTosVersion,
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
