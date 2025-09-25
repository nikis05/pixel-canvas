import { debounceTime } from "rxjs";
import { Editor } from "./model/editor";

export function initEditor(): Editor {
  const editorData = localStorage.getItem("@pixel-canvas/editor");
  const restoredEditor = editorData ? Editor.restore(editorData) : null;
  const editor = restoredEditor ?? Editor.empty();

  const backup = () => backupEditor(editor);

  void editor.stateObservable.pipe(debounceTime(3000)).forEach(backup);

  window.addEventListener("beforeunload", backup);

  return editor;
}

function backupEditor(editor: Editor) {
  const editorData = editor.save();
  localStorage.setItem("@pixel-canvas/editor", editorData);
}
