import { Page } from "@/components/Page";
import { API_URL } from "@/index";
import { ItemData } from "@/model/ItemData";
import { tryFetch } from "@/utils/tryFetch";
import { FC } from "react";
import useSWR from "swr";

type ExclusiveData = [ItemData, number];

export const Exclusives: FC = () => {
  const exclusives = useSWR("exclusives", () =>
    tryFetch(`${API_URL}/exclusives`).then<ExclusiveData[]>((resp) =>
      resp.json()
    )
  );
  return <Page back={true}>Exclusives</Page>;
};
