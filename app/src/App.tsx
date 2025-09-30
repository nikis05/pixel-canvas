import { retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { AppRoot } from "@telegram-apps/telegram-ui";
import { FC, useMemo } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { routes } from "./routes";
import { Nav } from "./components/Nav";

export const App: FC = () => {
  const lp = useMemo(() => retrieveLaunchParams(), []);
  return (
    <AppRoot
      appearance="dark"
      platform={["macos", "ios"].includes(lp.tgWebAppPlatform) ? "ios" : "base"}
    >
      <HashRouter>
        <Nav>
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} {...route} />
            ))}
            <Route path="*" element={<Navigate to="/editor" />} />
          </Routes>
        </Nav>
      </HashRouter>
    </AppRoot>
  );
};
