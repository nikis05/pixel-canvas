import { Modal, ModalHandle } from "@/components/Modal";
import { Section } from "@/components/Section";
import { WithSwr } from "@/components/WithSwr";
import { API_URL, STORE_ADDRESS } from "@/index";
import React, {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { fromNano } from "@ton/core";
import { Button, Input } from "@telegram-apps/telegram-ui";
import tonIcon from "./ton_symbol.svg";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useEditor } from "@/model/editor/useEditor";
import { BsCheckCircleFill, BsExclamationCircleFill } from "react-icons/bs";
import { tryFetch } from "@/utils/tryFetch";
import { useIsMounted } from "usehooks-ts";
import { captureException } from "@sentry/react";

export const BakeModal: FC<{
  handle: ModalHandle;
}> = ({ handle }) => {
  const itemPrice = useSWR("item_price", () =>
    tryFetch(`${API_URL}/item_price`)
      .then((resp) => resp.text())
      .then((text) => parseInt(text, 10))
  );

  console.log({ itemPrice });

  const [bakeResult, setBakeResult] = useState<boolean | null>(null);

  useEffect(() => {
    setBakeResult(null);
  }, [handle.isOpen, setBakeResult]);

  const isMounted = useIsMounted();
  const withSwrProps = useMemo(
    () => ({
      onComplete: (error: boolean) => {
        if (!isMounted()) return;
        setBakeResult(error);
      },
      handle,
    }),
    [isMounted, setBakeResult, handle]
  );

  return (
    <Modal handle={handle} srText="Mint NFT">
      {bakeResult == null ? (
        <WithSwr swr={itemPrice} Component={BakeForm} props={withSwrProps} />
      ) : (
        <div className="mb-6">
          {bakeResult == false ? (
            <Section
              Icon={BsCheckCircleFill}
              title="NFT minting is scheduled"
              description="NFT has been sent to minting. You should receive it in your wallet shortly. If there is an error, you will be refunded"
            />
          ) : (
            <Section
              Icon={BsExclamationCircleFill}
              title="Minting failed"
              description="Failed to send mint request. Please check your connection. You won't be charged."
            />
          )}
        </div>
      )}
    </Modal>
  );
};

function renderSectionIcon(): React.ReactNode {
  return (
    <div className="h-8 w-8 rounded-sm bg-white flex justify-center items-center text-white">
      <img className="h-4 w-4" src={tonIcon} />
    </div>
  );
}

const BakeForm: FC<{
  data: number | null;
  onComplete: (error: boolean) => void;
  handle: ModalHandle;
}> = ({ data, onComplete, handle }) => {
  const price = data != null ? fromNano(data) : "";
  const editor = useEditor();

  const [tonUI] = useTonConnectUI();

  const title = useRef<string>("");

  const onTitleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      title.current = e.target.value;
    },
    [title]
  );

  const artist = useRef<string>("");

  const onArtistChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      artist.current = e.target.value;
    },
    [artist]
  );

  const onButtonClick = useCallback(() => {
    (async () => {
      if (!tonUI.account) return;

      const payload = await editor.packForBaking(title.current, artist.current);

      handle.setLocked(true);
      try {
        await tonUI.sendTransaction(
          {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
              {
                address: STORE_ADDRESS,
                amount: data != null ? data.toString() : "",
                payload,
              },
            ],
          },
          { modals: ["before"] }
        );
      } catch {
        onComplete(true);
      }
      onComplete(false);
      handle.setLocked(false);
    })().catch(captureException);
  }, [tonUI, title, data, artist, onComplete, editor, handle]);

  return (
    <Section
      renderIcon={renderSectionIcon}
      title="Create your NFT"
      description={
        <div className="mb-6">
          <div>Make a unique NFT with your pixel-art</div>
          <div>Current service fee: {price} ton</div>
          <div className="mb-4 *:p-0! *:pt-4! *:pb-4!">
            <Input placeholder="Artwork title" onChange={onTitleChange} />
            <Input placeholder="Artist signature" onChange={onArtistChange} />
          </div>
          <Button onClick={onButtonClick}>Create NFT ({price}ton)</Button>
        </div>
      }
    />
  );
};
