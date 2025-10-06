import { RENDER_URL } from "@/index";
import { ItemData } from "@/model/ItemData";
import { tryFetch } from "@/utils/tryFetch";
import { useObjectUrl } from "@/utils/useObjectUrl";
import { Card, Skeleton } from "@telegram-apps/telegram-ui";
import { CardCell } from "@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardCell/CardCell";
import { FC } from "react";
import useSWR from "swr";

export const Item: FC<{ data: ItemData }> = ({ data }) => {
  const image = useSWR(`img/${data.index}`, (key) =>
    tryFetch(`${RENDER_URL}/${key}`).then((resp) => resp.blob())
  );
  const imageUrl = useObjectUrl(image.data ?? null);

  return (
    <Card>
      {imageUrl ? (
        <img className="h-65 w-65" src={imageUrl} />
      ) : (
        <Skeleton visible={true}>
          <div className="h-65 w-65"></div>
        </Skeleton>
      )}
      <CardCell subtitle={data.description}>{data.name}</CardCell>
    </Card>
  );
};
