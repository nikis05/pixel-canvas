import pRetry, { AbortError } from "p-retry";

export function tryFetch(url: string): Promise<Response> {
  return pRetry(
    async () => {
      try {
        const resp = await fetch(url);
        if (resp.status == 200) {
          return resp;
        } else if (resp.status == 429) {
          throw new Error("Too many requests");
        } else {
          throw new AbortError(
            `Request failed: ${resp.body} ${resp.statusText}`
          );
        }
      } catch (e: unknown) {
        throw new AbortError(e instanceof Error ? e : JSON.stringify(e));
      }
    },
    { retries: 5, factor: 1 }
  );
}
