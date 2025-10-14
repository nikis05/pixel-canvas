import { captureException } from "@sentry/react";
import { TonConnectUI } from "@tonconnect/ui-react";

export function openConnectModal(tonUI: TonConnectUI, onSelected: () => void) {
  const cancel = tonUI.onModalStateChange((state) => {
    cancel();
    if (state.status == "closed" && state.closeReason == "wallet-selected") {
      onSelected();
    }
  });
  tonUI.openModal().catch(captureException);
}
