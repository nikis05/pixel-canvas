import { debounceTime } from "rxjs";
import { Editor } from "./model/editor";
import { captureException } from "@sentry/react";
import {
  getCloudStorageItem,
  setCloudStorageItem,
} from "@telegram-apps/sdk-react";

const STORAGE_KEY = "@pixel-canvas/editor";

export async function initEditor(
  isCloudStorageAvail: boolean
): Promise<Editor> {
  const useLocalStorage = import.meta.env.DEV;

  console.log("Cloud storage availability:", { isCloudStorageAvail });

  const editorData = useLocalStorage
    ? (localStorage.getItem(STORAGE_KEY) ?? "")
    : isCloudStorageAvail
      ? await getCloudStorageItem(STORAGE_KEY)
      : null;
  const restoredEditor =
    editorData !== null ? Editor.restore(editorData) : null;
  const editor = restoredEditor ?? Editor.empty();

  const backup = useLocalStorage
    ? (editor: Editor) => localStorage.setItem(STORAGE_KEY, editor.save())
    : (editor: Editor) => {
        if (setCloudStorageItem.isAvailable()) {
          setCloudStorageItem(STORAGE_KEY, editor.save()).catch(
            captureException
          );
        }
      };

  editor.editorObservable
    .pipe(debounceTime(3000))
    .forEach(backup)
    .catch(captureException);

  window.addEventListener("beforeunload", () => backup(editor));

  return editor;
}
