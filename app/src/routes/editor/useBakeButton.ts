import { toVoid } from "@/utils/toVoid";
import {
  useTonConnectModal,
  useTonConnectUI,
  useTonWallet,
} from "@tonconnect/ui-react";
import { useCallback, useMemo } from "react";

export function useBakeButton() {
  const wallet = useTonWallet();

  const [tonUi] = useTonConnectUI();

  const { state: tonConnectModalState, open: openTonConnectModal } =
    useTonConnectModal();

  const isActive = tonConnectModalState.status == "opened";

  const onClick = useCallback(
    toVoid(async () => {
      if (wallet == null) {
        openTonConnectModal();
        return;
      }
      alert("already logged in");
    }),
    [wallet, openTonConnectModal]
  );

  const output = useMemo(() => ({ isActive, onClick }), [isActive, onClick]);

  return output;
}
