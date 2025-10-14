import { ExclusivesBanner } from "@/components/ExclusivesBanner";
import { Page } from "@/components/Page";
import { IconButton, SegmentedControl } from "@telegram-apps/telegram-ui";
import { FC, useCallback, useMemo, useState } from "react";
import {
  TonConnectButton,
  useTonConnectUI,
  useTonWallet,
} from "@tonconnect/ui-react";
import { MyCollection } from "./MyCollection";
import { Banner } from "@/components/Banner";
import { Address } from "@ton/core";
import { IoLogOut } from "react-icons/io5";
import { captureException } from "@sentry/react";
import { showPopup } from "@telegram-apps/sdk-react";

export const Collection: FC = () => {
  const [openTab, setOpenTab] = useState<"collection" | "sales" | "favorites">(
    "collection"
  );

  const onTabClick = useMemo(
    () => ({
      collection: () => setOpenTab("collection"),
      sales: () => setOpenTab("sales"),
      favorites: () => setOpenTab("favorites"),
    }),
    [setOpenTab]
  );

  const wallet = useTonWallet();

  const [tonUI] = useTonConnectUI();

  const onDisconnectButtonClick = useCallback(() => {
    (async () => {
      let shouldDisconnect: boolean;
      if (!import.meta.env.DEV) {
        const response = await showPopup({
          title: "Log out?",
          message: "Are you sure you want to log out of your wallet?",
          buttons: [
            { id: "cancel", type: "cancel" },
            { id: "ok", type: "destructive", text: "Proceed" },
          ],
        });
        shouldDisconnect = response == "ok";
      } else {
        shouldDisconnect = confirm("Log out?");
      }
      if (!shouldDisconnect) return;
      await tonUI.disconnect();
    })().catch(captureException);
  }, [tonUI]);

  return (
    <Page back={false}>
      <div className="h-full flex flex-col">
        <div className="flex p-5">
          <SegmentedControl>
            <SegmentedControl.Item
              selected={openTab == "collection"}
              onClick={onTabClick.collection}
            >
              Collection
            </SegmentedControl.Item>
            <SegmentedControl.Item
              selected={openTab == "sales"}
              onClick={onTabClick.sales}
            >
              My sales
            </SegmentedControl.Item>
            <SegmentedControl.Item
              selected={openTab == "favorites"}
              onClick={onTabClick.favorites}
            >
              Favorites
            </SegmentedControl.Item>
          </SegmentedControl>
          {wallet != null && (
            <div className="flex items-center ml-2">
              <IconButton size="l" onClick={onDisconnectButtonClick}>
                <IoLogOut />
              </IconButton>
            </div>
          )}
        </div>
        {openTab == "collection" &&
          (wallet != null ? (
            <MyCollection
              userAddress={Address.parse(wallet.account.address).toString({
                urlSafe: true,
              })}
            />
          ) : (
            <div className="flex-1 flex justify-center items-center">
              <Banner
                title="Log in to see your NFTs"
                description="Log in via a TON wallet to browse your collection"
                button={
                  <div className="flex justify-center">
                    <TonConnectButton />
                  </div>
                }
              />
            </div>
          ))}
        {(openTab == "sales" || openTab == "favorites") && (
          <div className="flex-1 flex justify-center items-center">
            <ExclusivesBanner />
          </div>
        )}
      </div>
    </Page>
  );
};
