import { debounceTime } from "rxjs";
import { Editor } from "./model/editor";
import { captureException } from "@sentry/react";
import { EDITOR_STORAGE_KEY } from "./App";
import { trySetDeviceStorageKey } from "./utils/deviceStorage";

export function initEditor(editorData: string | null): Editor {
  const useLocalStorage = import.meta.env.DEV;

  const restoredEditor =
    editorData !== null ? Editor.restore(editorData) : null;
  const editor = restoredEditor ?? Editor.empty();

  const backup = useLocalStorage
    ? (editor: Editor) =>
        localStorage.setItem(EDITOR_STORAGE_KEY, editor.save())
    : (editor: Editor) => {
        trySetDeviceStorageKey(EDITOR_STORAGE_KEY, editor.save());
      };

  editor.editorObservable
    .pipe(debounceTime(3000))
    .forEach(backup)
    .catch(captureException);

  window.addEventListener("beforeunload", () => backup(editor));

  return editor;
}
