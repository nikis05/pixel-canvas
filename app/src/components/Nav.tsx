import { FC, PropsWithChildren, useCallback, useMemo } from "react";
import { Tabbar as TabbarUI } from "@telegram-apps/telegram-ui";
import { useLocation, useNavigate } from "react-router-dom";
import { BsCollection, BsFilePlus, BsGem } from "react-icons/bs";

export const Nav: FC<PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isSelected = useCallback(
    (route: string) => location.pathname == `/${route}`,
    [location.pathname]
  );

  const onClick = useMemo(
    () => ({
      feed: () => navigate("/feed"),
      editor: () => navigate("/editor"),
      collection: () => navigate("/collection"),
    }),
    [navigate]
  );

  return (
    <div className="h-screen">
      <div className="h-[calc(100%_-_48px)]">{children}</div>
      <TabbarUI>
        <TabbarUI.Item
          name="Feed"
          selected={isSelected("feed")}
          onClick={onClick["feed"]}
        >
          <BsGem />
        </TabbarUI.Item>
        <TabbarUI.Item
          name="Create"
          selected={isSelected("editor")}
          onClick={onClick["editor"]}
        >
          <BsFilePlus />
        </TabbarUI.Item>

        <TabbarUI.Item
          name="Collection"
          selected={isSelected("collection")}
          onClick={onClick["collection"]}
        >
          <BsCollection />
        </TabbarUI.Item>
      </TabbarUI>
    </div>
  );
};
