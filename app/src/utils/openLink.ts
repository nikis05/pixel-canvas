import { openLink as tgOpenLink } from "@telegram-apps/sdk-react";

export function openLink(url: string) {
  if (import.meta.env.DEV) {
    window.open(url);
  } else {
    tgOpenLink(url);
  }
}
