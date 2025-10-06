import { ExclusivesBanner } from "@/components/ExclusivesBanner";
import { Page } from "@/components/Page";
import { FC } from "react";

export const Feed: FC = () => {
  return (
    <Page back={false}>
      <div className="h-full flex justify-center items-center">
        <ExclusivesBanner />
      </div>
    </Page>
  );
};
