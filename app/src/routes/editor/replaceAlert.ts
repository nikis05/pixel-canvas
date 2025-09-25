import { showPopup } from "@telegram-apps/sdk-react";

export async function confirmReplace(isEmpty: () => boolean): Promise<boolean> {
  if (isEmpty()) return true;
  let result: boolean;
  if (!import.meta.env.DEV) {
    const response = await showPopup({
      title: "Clear the canvas?",
      message:
        "This action will clear your canvas, any unsaved work may be lost",
      buttons: [
        { id: "cancel", type: "cancel" },
        { id: "ok", type: "destructive", text: "Proceed" },
      ],
    });

    result = response == "ok";
  } else {
    result = confirm("Clear the canvas?");
  }

  return result;
}
