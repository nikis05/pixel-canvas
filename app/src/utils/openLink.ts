export function openLink(url: string) {
  if (import.meta.env.DEV) {
    window.open(url);
  } else {
    openLink(url);
  }
}
