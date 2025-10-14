import { RENDER_URL } from "@/index";
import { ItemData } from "@/model/ItemData";
import { tryFetch } from "@/utils/tryFetch";
import { useObjectUrl } from "@/utils/useObjectUrl";
import { Card, Skeleton } from "@telegram-apps/telegram-ui";
import { CardCell } from "@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardCell/CardCell";
import { CardChip } from "@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardChip/CardChip";
import { fromNano } from "@ton/core";
import { FC } from "react";
import useSWR from "swr";

export const Item: FC<{
  data: ItemData;
  purchaseable?: { price: number; onPurchase: () => void };
}> = ({ data, purchaseable }) => {
  const image = useSWR(`img/${data.index}`, (key) =>
    tryFetch(`${RENDER_URL}/${key}`).then((resp) => resp.blob())
  );
  const imageUrl = useObjectUrl(image.data ?? null);

  return (
    <Card>
      {purchaseable && (
        <CardChip onClick={purchaseable.onPurchase}>
          {fromNano(purchaseable.price)}
        </CardChip>
      )}
      {imageUrl !== null ? (
        <img className="w-full aspect-square" src={imageUrl} />
      ) : (
        <Skeleton visible={true}>
          <div className="w-full aspect-square"></div>
        </Skeleton>
      )}
      <CardCell subtitle={data.description}>{data.name}</CardCell>
    </Card>
  );
};
