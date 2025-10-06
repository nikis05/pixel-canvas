import { Button } from "@telegram-apps/telegram-ui";
import { FC, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Banner } from "./Banner";

export const ExclusivesBanner: FC = () => {
  const navigate = useNavigate();
  const onButtonClick = useCallback(() => {
    navigate("/exclusives");
  }, [navigate]);

  return (
    <Banner
      title="The Market is opening soon 💰"
      description={`Here, you’ll be able to vote for and buy NFTs made by other users — \
and sell your NFTs to other users. In the meantime, check out \
exclusive NFTs from the creators of the app.`}
      button={
        <Button className="w-full" onClick={onButtonClick}>
          Check them out
        </Button>
      }
    />
  );
};
