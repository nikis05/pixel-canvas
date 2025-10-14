import { API_URL } from "@/index";
import { ItemData } from "@/model/ItemData";
import { tryFetch } from "@/utils/tryFetch";
import { FC, useCallback } from "react";
import useSWRInfinite from "swr/infinite";
import { Banner } from "@/components/Banner";
import { Button, Spinner } from "@telegram-apps/telegram-ui";
import { useNavigate } from "react-router-dom";
import { ItemList } from "./ItemList";
import { captureException } from "@sentry/react";

export const MyCollection: FC<{ userAddress: string }> = ({ userAddress }) => {
  const swr = useSWRInfinite(
    (i) => `nfts?owner_address=${userAddress}&page=${i}`,
    (key) =>
      tryFetch(`${API_URL}/${key}`).then<{
        items: ItemData[];
        has_next_page: boolean;
      }>((resp) => resp.json())
  );

  const { data, isValidating, mutate } = swr;

  const error = swr.error as unknown;

  const items = data?.map((page) => page.items).flat() ?? [];

  const navigate = useNavigate();

  const onCreateButtonClick = useCallback(
    () => navigate("/editor"),
    [navigate]
  );

  const onRefetchButtonClick = useCallback(
    () => mutate().catch(captureException),
    [mutate]
  );

  const fetchMore = useCallback(() => {
    if (swr.isValidating || swr.error !== undefined) return;
    swr.setSize(swr.size + 1).catch(captureException);
  }, [swr]);

  const hasNextPage = swr.data?.[swr.data?.length - 1].has_next_page ?? false;

  return items.length == 0 ? (
    <div className="h-full flex justify-center items-center">
      {isValidating ? (
        <Spinner size="l" />
      ) : (
        <Banner
          title={
            error !== undefined ? "Error loading NFTs" : "You have no NFTs yet"
          }
          description={
            error !== undefined ? "Failed to load NFTs" : "Create one now!"
          }
          button={
            <Button
              className="w-full"
              onClick={
                error !== undefined ? onRefetchButtonClick : onCreateButtonClick
              }
            >
              {error !== undefined ? "Reload" : "Create an NFT"}
            </Button>
          }
        />
      )}
    </div>
  ) : (
    <ItemList
      items={items}
      loading={isValidating}
      error={error !== undefined}
      fetchMore={fetchMore}
      hasNextPage={hasNextPage}
    />
  );
};
