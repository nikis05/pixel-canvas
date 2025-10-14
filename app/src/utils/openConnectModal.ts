import { captureException } from "@sentry/react";
import { TonConnectUI } from "@tonconnect/ui-react";

export function openConnectModal(tonUI: TonConnectUI, onSelected: () => void) {
  const cancel = tonUI.onModalStateChange((state) => {
    if (state.status != "closed") return;
    cancel();
    if (state.closeReason == "wallet-selected") {
      onSelected();
    }
  });
  tonUI.openModal().catch(captureException);
}
