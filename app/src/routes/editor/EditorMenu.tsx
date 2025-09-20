import { BrushPicker } from "@/components/BrushPicker";
import { ToolMenu } from "@/components/ToolMenu/ToolMenu";
import { Color } from "@/model/editor";
import { useEditor } from "@/model/editor/useEditor";
import { Modal } from "@telegram-apps/telegram-ui";
import classNames from "classnames";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  BsDownload,
  BsEraser,
  BsPencil,
  BsTrash,
  BsUpload,
} from "react-icons/bs";
import { LuRedo2, LuUndo2 } from "react-icons/lu";

type Tool = "pencil" | "eraser";

export const EditorMenu: FC = () => {
  const {
    setColor: setCurrentColor,
    brushSize,
    setBrushSize,
    undo,
    redo,
    mayUndo,
    mayRedo,
  } = useEditor();

  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const onPaletteOpen = useCallback(
    () => setPaletteOpen(true),
    [setPaletteOpen]
  );

  const [pickedColor, setPickedColor] = useState<Color>(() => Color.white());

  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const onToolSelected = useMemo(() => {
    const onSelected = (tool: Tool) => () => {
      if (selectedTool == tool) setSelectedTool(null);
      else setSelectedTool(tool);
    };

    return {
      pencil: onSelected("pencil"),
      eraser: onSelected("eraser"),
    };
  }, [selectedTool, setSelectedTool]);

  useEffect(() => {
    setCurrentColor(
      selectedTool == "eraser"
        ? Color.white()
        : selectedTool == "pencil"
          ? pickedColor
          : null
    );
  }, [setCurrentColor, selectedTool, pickedColor]);

  return (
    <>
      <ToolMenu
        items={[
          {
            key: "pencil",
            Icon: BsPencil,
            active: selectedTool == "pencil",
            onClick: onToolSelected.pencil,
          },
          {
            key: "palette",
            renderIcon: () => {
              const className = classNames(
                "h-4",
                "w-4",
                "box-border",
                "rounded-sm",
                "border-1",
                "flex",
                "justify-center",
                "items-center",
                "text-[8px]",
                {
                  "border-(--tgui--link_color)": paletteOpen,
                  "border-(--tgiu--text_color)": !paletteOpen,
                  "group-hover:border-(--tgui--link_color)": !paletteOpen,
                }
              );
              return (
                <div
                  className={className}
                  style={{ backgroundColor: pickedColor.toHex() }}
                  onClick={onPaletteOpen}
                >
                  <span className="mix-blend-difference">{brushSize + 1}</span>
                </div>
              );
            },
            active: false,
            onClick: () => {},
          },
          {
            key: "eraser",
            Icon: BsEraser,
            active: selectedTool == "eraser",
            onClick: onToolSelected.eraser,
          },
          { key: "undo", Icon: LuUndo2, disabled: !mayUndo, onClick: undo },
          { key: "redo", Icon: LuRedo2, disabled: !mayRedo, onClick: redo },
          "divider",
          { key: "upload", Icon: BsUpload, active: false, onClick: () => {} },
          {
            key: "download",
            Icon: BsDownload,
            active: false,
            onClick: () => {},
          },
          { key: "clear", Icon: BsTrash, active: false, onClick: () => {} },
        ]}
      />
      <Modal
        open={paletteOpen}
        header={
          <Modal.Header>
            <div className="sr-only">Select color and brush size</div>
          </Modal.Header>
        }
        onOpenChange={setPaletteOpen}
      >
        <div className="h-[min(75vh,_100vw)] flex flex-col items-center">
          <div className="flex-1 w-[min(75vh,_100vw)]">
            <BrushPicker
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              color={pickedColor}
              onColorChange={setPickedColor}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};
