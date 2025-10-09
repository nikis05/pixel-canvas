import { ExclusivesBanner } from "@/components/ExclusivesBanner";
import { Page } from "@/components/Page";
import { SegmentedControl } from "@telegram-apps/telegram-ui";
import { FC, useMemo, useState } from "react";
import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";
import { MyCollection } from "./MyCollection";
import { Banner } from "@/components/Banner";
import { Address } from "@ton/core";

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

  return (
    <Page back={false}>
      <div className="h-full flex flex-col">
        <div className="p-5">
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
