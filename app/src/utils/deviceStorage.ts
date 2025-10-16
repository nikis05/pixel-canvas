import { postEvent, on, createRequestId } from "@telegram-apps/sdk-react";

export function getDeviceStorageKey(key: string): Promise<string | null> {
  return new Promise((res, rej) => {
    const reqId = createRequestId();

    const cancel1 = on("device_storage_key_received", (e) => {
      if (e.req_id != reqId) return;
      cancel1();
      cancel2();
      cancel3();
      res(e.value);
    });

    const cancel2 = on("device_storage_failed", (e) => {
      if (e.req_id != reqId) return;
      cancel1();
      cancel2();
      cancel3();
      rej(new Error(e.error));
    });

    const timeout = setTimeout(() => {
      cancel1();
      cancel2();
      cancel3();
      rej(new Error("Timeout exceeded"));
    }, 2000);

    const cancel3 = () => timeout.close();

    postEvent("web_app_device_storage_get_key", {
      req_id: reqId,
      key,
    });
  });
}

export function trySetDeviceStorageKey(key: string, value: string | null) {
  const reqId = createRequestId();
  postEvent("web_app_device_storage_save_key", { req_id: reqId, key, value });
}
