import { map } from "rxjs";
import { Color, Editor, LoadFromFileStatus, Point, StateSnapshot } from ".";
import {
  createContext,
  FC,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useObservable } from "react-rx";
import { copyTextToClipboard } from "@telegram-apps/sdk-react";
import { publicUrl } from "@/utils/publicUrl";
import { openLink } from "@/utils/openLink";

const EditorContext = createContext<{
  editor: MutableRefObject<Editor>;
  isDrawing: MutableRefObject<boolean>;
  color: Color | null;
  setColor: (color: Color | null) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
} | null>(null);

const PixelContext = createContext<{
  editor: MutableRefObject<Editor>;
  isDrawing: MutableRefObject<boolean>;
  editorState: StateSnapshot;
  brushSize: MutableRefObject<number>;
} | null>(null);

export const EditorProvider: FC<PropsWithChildren<{ editor: Editor }>> = ({
  editor,
  children,
}) => {
  const editorRef = useRef<Editor>(editor);
  const isDrawing = useRef<boolean>(false);

  const [color, setColor] = useState<Color | null>(null);

  const [brushSize, setBrushSize] = useState<number>(0);
  const brushSizeRef = useRef<number>(0);
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSizeRef, brushSize]);

  const initEditorState = useMemo(() => editor.stateSnapshot(), [editor]);
  const editorStateObservable = useMemo(() => editor.stateObservable, [editor]);
  const editorState = useObservable(editorStateObservable, initEditorState);

  const editorValue = useMemo(
    () => ({
      editor: editorRef,
      isDrawing,
      color,
      setColor,
      brushSize,
      setBrushSize,
    }),
    [editorRef, isDrawing, color, setColor, brushSize, setBrushSize]
  );

  const pixelValue = useMemo(
    () => ({
      editor: editorRef,
      isDrawing,
      editorState,
      brushSize: brushSizeRef,
    }),
    [editor, isDrawing, editorState, brushSizeRef]
  );

  return (
    <EditorContext.Provider value={editorValue}>
      <PixelContext.Provider value={pixelValue}>
        {children}
      </PixelContext.Provider>
    </EditorContext.Provider>
  );
};

export type UseEditorOutput = {
  color: Color | null;
  setColor: (color: Color | null) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  onDrawStart: () => void;
  onDrawEnd: () => void;
  clear: () => void;
  loadFromFile: (file: File) => Promise<LoadFromFileStatus>;
  saveToFile: (upscale: boolean) => Promise<void>;
  copyDna: () => Promise<void>;
  loadFromDna: (dna: string) => Promise<boolean>;
  packForBaking: (title: string, artist: string) => Promise<string>;
  undo: () => void;
  redo: () => void;
  mayUndo: boolean;
  mayRedo: boolean;
  isEmpty: () => boolean;
};

export function useEditor(): UseEditorOutput {
  const context = useContext(EditorContext);
  if (!context) throw new Error("Must be wrapped in EditorProvider");
  const { editor, isDrawing, color, setColor, brushSize, setBrushSize } =
    context;

  const onDrawStart = useCallback(() => {
    if (!color) {
      return;
    }
    editor.current.beginEdit(color);
    isDrawing.current = true;
  }, [color, editor, isDrawing]);

  const onDrawEnd = useCallback(() => {
    if (!color) return;
    editor.current.commitEdit();
    isDrawing.current = false;
  }, [color, editor, isDrawing]);

  const clear = useCallback(() => editor.current.clear(), [editor]);

  const loadFromFile = useCallback(
    (file: File) => editor.current.loadFromFile(file),
    [editor]
  );

  const saveToFile = useCallback(
    async (upscale: boolean) => {
      let path = "/save-image#";
      if (upscale) path += "u";
      else path += "n";
      path += await editor.current.getDna();
      openLink(publicUrl(path));
    },
    [editor]
  );

  const copyDna = useCallback(async () => {
    const dna = await editor.current.getDna();
    await copyTextToClipboard(dna);
  }, [editor, navigator]);

  const loadFromDna = useCallback(
    (dna: string) => editor.current.loadFromDna(dna),
    [editor]
  );

  const packForBaking = useCallback(
    (title: string, artist: string) =>
      editor.current.packForBaking(title, artist),
    [editor]
  );

  const undo = useCallback(() => editor.current.undo(), [editor]);

  const redo = useCallback(() => editor.current.redo(), [editor]);

  const initAllowedActions = useMemo(
    () => editor.current.allowedActions(),
    [editor]
  );

  const mayUndoObservable = useMemo(
    () =>
      editor.current.allowedActionsObservable.pipe(
        map((allowedActions) => allowedActions.undo)
      ),
    [editor]
  );
  const mayUndo = useObservable(mayUndoObservable, initAllowedActions.undo);

  const mayRedoObservable = useMemo(
    () =>
      editor.current.allowedActionsObservable.pipe(
        map((allowedActions) => allowedActions.redo)
      ),
    [editor]
  );
  const mayRedo = useObservable(mayRedoObservable, initAllowedActions.redo);

  const isEmpty = useCallback(() => editor.current.isEmpty, [editor]);

  const output = useMemo(
    () => ({
      color,
      setColor,
      brushSize,
      setBrushSize,
      onDrawStart,
      onDrawEnd,
      clear,
      loadFromFile,
      saveToFile,
      copyDna,
      loadFromDna,
      packForBaking,
      undo,
      redo,
      mayUndo,
      mayRedo,
      isEmpty,
    }),
    [
      color,
      setColor,
      brushSize,
      setBrushSize,
      onDrawStart,
      onDrawEnd,
      clear,
      loadFromFile,
      saveToFile,
      copyDna,
      loadFromDna,
      packForBaking,
      undo,
      redo,
      mayUndo,
      mayRedo,
      isEmpty,
    ]
  );

  return output;
}

export type UsePixelOutput = {
  color: Color;
  onEnter: () => void;
};

export function usePixel(point: Point): UsePixelOutput {
  const context = useContext(PixelContext);
  if (!context) throw new Error("Must be wrapped in EditorProvider");
  const { editor, isDrawing, editorState, brushSize } = context;

  const color = editorState.readPoint(point);

  const onEnter = useCallback(() => {
    if (!isDrawing.current) return;
    editor.current.brushPoints(point, brushSize.current);
  }, [isDrawing, editor, point, brushSize]);

  const output = useMemo(() => ({ color, onEnter }), [color, onEnter]);

  return output;
}
