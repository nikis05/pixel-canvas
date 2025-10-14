import { Modal, ModalHandle } from "@/components/Modal";
import { Section } from "@/components/Section";
import { STORE_ADDRESS } from "@/index";
import { openConnectModal } from "@/utils/openConnectModal";
import { captureException } from "@sentry/react";
import { Button, Spinner } from "@telegram-apps/telegram-ui";
import { fromNano } from "@ton/core";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { FC, useCallback, useEffect, useState } from "react";
import {
  BsCheckCircleFill,
  BsExclamationCircleFill,
  BsGem,
} from "react-icons/bs";
import { useIsMounted } from "usehooks-ts";

export const PurchaseExclusiveModal: FC<{
  handle: ModalHandle;
  purchaseable: { index: number; name: string; price: number } | null;
  onConnect: () => void;
}> = ({ handle, purchaseable, onConnect }) => {
  const price = purchaseable ? fromNano(purchaseable.price) : null;
  const [purchaseResult, setPurchaseResult] = useState<
    "success" | "error" | "loading" | null
  >(null);

  useEffect(() => {
    setPurchaseResult(null);
  }, [handle.isOpen]);

  const wallet = useTonWallet();

  const [tonUI] = useTonConnectUI();

  const isMounted = useIsMounted();
  const onButtonClick = useCallback(() => {
    (async () => {
      if (!purchaseable) return;
      if (!wallet) {
        handle.setOpen(false);
        openConnectModal(tonUI, onConnect);
        return;
      }
      setPurchaseResult("loading");
      const wasm = await import("wasm");
      await wasm.default();

      const payload = wasm.pack_purchase_exclusive(purchaseable.index);

      handle.setLocked(true);
      try {
        await tonUI.sendTransaction(
          {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
              {
                address: STORE_ADDRESS,
                amount: purchaseable.price.toString(),
                payload,
              },
            ],
          },
          { modals: ["before"] }
        );
        if (!isMounted()) return;
        setPurchaseResult("success");
      } catch {
        if (!isMounted()) return;
        setPurchaseResult("error");
      }
      handle.setLocked(false);
    })().catch(captureException);
  }, [
    handle,
    wallet,
    onConnect,
    tonUI,
    purchaseable,
    isMounted,
    setPurchaseResult,
  ]);

  return (
    <Modal handle={handle} srText="Purchase exclusive">
      <div className="mb-6">
        {purchaseResult == "success" ? (
          <Section
            Icon={BsCheckCircleFill}
            title="Purchase is cheduled"
            description="The transaction has been started. You should receive it in your wallet shortly. If there is an error, you will be refunded"
          />
        ) : purchaseResult == "error" ? (
          <Section
            Icon={BsExclamationCircleFill}
            title="Purchase failed"
            description="Failed to send purchase request. Please check your connection. You won't be charged."
          />
        ) : purchaseable ? (
          <Section
            Icon={BsGem}
            title="Purchase exclusive"
            description={
              <div className="mb-6">
                <div>
                  You are about to purchase an exlusive pixel-art NFT:{" "}
                  {purchaseable.name}
                </div>
                <div className="mb-4">Current price: {price} ton</div>
                {purchaseResult == null ? (
                  <Button onClick={onButtonClick}>
                    Buy exclusive ({price}ton)
                  </Button>
                ) : (
                  <Spinner size="l" />
                )}
              </div>
            }
          />
        ) : null}
      </div>
    </Modal>
  );
};
