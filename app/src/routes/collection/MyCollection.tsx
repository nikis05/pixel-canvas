import { API_URL } from "@/index";
import { ItemData } from "@/model/ItemData";
import { tryFetch } from "@/utils/tryFetch";
import { FC, useCallback } from "react";
import useSWRInfinite from "swr/infinite";
import { Banner } from "@/components/Banner";
import { Button } from "@telegram-apps/telegram-ui";
import { useNavigate } from "react-router-dom";
import { ItemList } from "./ItemList";

export const MyCollection: FC<{ userAddress: string }> = ({ userAddress }) => {
  const swr = useSWRInfinite(
    (i) => `nfts?owner_address=${userAddress}&page=${i}`,
    (key) =>
      tryFetch(`${API_URL}/${key}`).then<ItemData[]>((resp) => resp.json())
  );

  const { data, isValidating, size, setSize, mutate } = swr;
  const error = swr.error as unknown;

  const items = data?.flat() ?? [];

  const navigate = useNavigate();

  const onCreateButtonClick = useCallback(
    () => navigate("/editor"),
    [navigate]
  );

  const fetchMore = useCallback(() => {
    if (isValidating) return;
    void setSize(size + 1);
  }, [size, setSize]);

  return items.length == 0 ? (
    <div className="h-full flex justify-center items-center">
      <Banner
        title="You have no NFTs yet"
        description="Create one now!"
        button={
          <Button className="w-full" onClick={onCreateButtonClick}>
            Create an NFT
          </Button>
        }
      />
    </div>
  ) : (
    <ItemList
      items={items}
      loading={isValidating}
      error={!!error}
      fetchMore={fetchMore}
    />
  );
};
