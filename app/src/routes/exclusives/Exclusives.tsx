import { Page } from "@/components/Page";
import { API_URL } from "@/index";
import { ItemData } from "@/model/ItemData";
import { tryFetch } from "@/utils/tryFetch";
import { FC, useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { Item } from "../collection/Item";
import { Button, Spinner } from "@telegram-apps/telegram-ui";
import { Banner } from "@/components/Banner";
import { PurchaseExclusiveModal } from "./PurchaseExlusiveModal";
import { useModal } from "@/components/Modal";
import { captureException } from "@sentry/react";
import { useIsMounted } from "usehooks-ts";

type ExclusiveData = [ItemData, number];

export const Exclusives: FC = () => {
  const swr = useSWR("exclusives", () =>
    tryFetch(`${API_URL}/exclusives`).then<ExclusiveData[]>((resp) =>
      resp.json()
    )
  );

  const { data, isValidating, mutate } = swr;

  const error = swr.error as unknown;

  const items = useMemo(() => data ?? [], [data]);

  const onRefetchButtonClick = useCallback(() => {
    mutate().catch(captureException);
  }, [mutate]);

  const [purchaseState, setPurchaseState] = useState<{
    index: number;
    name: string;
    price: number;
  } | null>(null);

  const purchaseModal = useModal();

  const purchaseables = useMemo(
    () =>
      new Map(
        items.map(([item, price]) => [
          item.index,
          {
            price,
            onPurchase: () => {
              setPurchaseState({ index: item.index, name: item.name, price });
              purchaseModal.open();
            },
          },
        ])
      ),
    [items, setPurchaseState, purchaseModal]
  );

  const isMounted = useIsMounted();

  const onPurchaseModalConnect = useCallback(() => {
    if (!isMounted()) return;
    purchaseModal.open();
  }, [isMounted, purchaseModal]);

  return (
    <>
      <Page back={true}>
        {items.length == 0 ? (
          <div className="h-full flex justify-center items-center">
            {isValidating ? (
              <Spinner size="l" />
            ) : (
              <Banner
                title={
                  error !== undefined
                    ? "Error loading exclusives"
                    : "No exclusives"
                }
                description={
                  error !== undefined
                    ? "Failed to load exclusives"
                    : "There are no exclusives for sale at the moment"
                }
                button={
                  error !== undefined ? (
                    <Button className="w-full" onClick={onRefetchButtonClick}>
                      Reload
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        ) : (
          <div className="w-full overflow-y-auto flex justify-center">
            {items.map(([item]) => {
              return (
                <div
                  key={item.index}
                  className="w-[min(100%,_280px)] p-5 flex justify-center"
                >
                  <Item
                    data={item}
                    purchaseable={purchaseables.get(item.index)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Page>
      <PurchaseExclusiveModal
        handle={purchaseModal}
        purchaseable={purchaseState}
        onConnect={onPurchaseModalConnect}
      />
    </>
  );
};
