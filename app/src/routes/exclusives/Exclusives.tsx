import { Page } from "@/components/Page";
import { API_URL } from "@/index";
import { ItemData } from "@/model/ItemData";
import { tryFetch } from "@/utils/tryFetch";
import { FC, useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { Item } from "../collection/Item";
import { Button, Spinner } from "@telegram-apps/telegram-ui";
import _ from "lodash";
import { Banner } from "@/components/Banner";
import { PurchaseExclusiveModal } from "./PurchaseExlusiveModal";
import { useModal } from "@/components/Modal";

type ExclusiveData = [ItemData, number];

export const Exclusives: FC = () => {
  const swr = useSWR("exclusives", () =>
    tryFetch(`${API_URL}/exclusives`).then<ExclusiveData[]>((resp) =>
      resp.json()
    )
  );

  const { data, isValidating, mutate } = swr;

  const error = swr.error as unknown;

  const items = data ?? [];

  const onRefetchButtonClick = useCallback(() => {
    void mutate();
  }, [mutate]);

  const [purchaseState, setPurchaseState] = useState<{
    index: number;
    name: string;
    price: number;
  } | null>(null);

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
    [items, setPurchaseState]
  );

  const purchaseModal = useModal();

  return (
    <>
      <Page back={true}>
        {items.length == 0 ? (
          <div className="h-full flex justify-center items-center">
            {isValidating ? (
              <Spinner size="l" />
            ) : (
              <Banner
                title={error ? "Error loading exclusives" : "No exclusives"}
                description={
                  error
                    ? "Failed to load exclusives"
                    : "There are no exclusives for sale at the moment"
                }
                button={
                  error ? (
                    <Button className="w-full" onClick={onRefetchButtonClick}>
                      Reload
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        ) : (
          <div className="h-full w-full overflow-y-auto">
            {_.chunk(items, 2).map((row) => {
              const sortedRow = [...row].sort(
                (a, b) => a[0].index - b[0].index
              );
              const item1 = sortedRow[0][0];
              const item2 = sortedRow.at(1)?.[0];
              return (
                <div key={item1.index} className="flex justify-center">
                  <div className="p-5 w-[min(100%,_280px)]">
                    <Item
                      data={item1}
                      purchaseable={purchaseables.get(item1.index)}
                    />
                  </div>
                  <div className="p-5 w-[min(100%,_280px)]">
                    {item2 ? (
                      <Item
                        data={item2}
                        purchaseable={purchaseables.get(item2.index)}
                      />
                    ) : (
                      <div className="w-65" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Page>
      <PurchaseExclusiveModal
        handle={purchaseModal}
        purchaseable={purchaseState}
      />
    </>
  );
};
