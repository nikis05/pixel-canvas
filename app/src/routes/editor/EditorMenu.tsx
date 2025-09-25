import { BrushPicker } from "@/components/BrushPicker";
import { Modal, useModal } from "@/components/Modal";
import { ToolMenu } from "@/components/ToolMenu/ToolMenu";
import { Color } from "@/model/editor";
import { useEditor } from "@/model/editor/useEditor";
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
import { UploadMenu } from "./UploadMenu";
import { DownloadMenu } from "./DownloadMenu";
import { confirmReplace } from "./replaceAlert";
import { toVoid } from "@/utils/toVoid";

type Tool = "pencil" | "eraser";

export const EditorMenu: FC = () => {
  const {
    setColor: setCurrentColor,
    brushSize,
    setBrushSize,
    clear,
    undo,
    redo,
    mayUndo,
    mayRedo,
    isEmpty,
  } = useEditor();

  const paletteModal = useModal();

  const uploadModal = useModal();

  const downloadModal = useModal();

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

  const onClear = useCallback(
    toVoid(async () => {
      if (!(await confirmReplace(isEmpty))) return;
      clear();
    }),
    [confirmReplace, isEmpty, clear]
  );

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
                  "border-(--tgui--link_color)": paletteModal.isOpen,
                  "border-(--tgiu--text_color)": !paletteModal.isOpen,
                  "group-hover:border-(--tgui--link_color)":
                    !paletteModal.isOpen,
                }
              );
              return (
                <div
                  className={className}
                  style={{ backgroundColor: pickedColor.toHex() }}
                  onClick={paletteModal.open}
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
          {
            key: "upload",
            Icon: BsUpload,
            active: false,
            onClick: uploadModal.open,
          },
          {
            key: "download",
            Icon: BsDownload,
            active: false,
            onClick: downloadModal.open,
          },
          { key: "clear", Icon: BsTrash, active: false, onClick: onClear },
        ]}
      />
      <Modal handle={paletteModal} srText="Select brush size and color">
        <div className="h-[min(75vh,_100vw)] w-[min(75vh,_100vw)]">
          <BrushPicker
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            color={pickedColor}
            onColorChange={setPickedColor}
          />
        </div>
      </Modal>
      <Modal handle={uploadModal} srText="Upload image">
        <UploadMenu />
      </Modal>
      <Modal handle={downloadModal} srText="Download image">
        <DownloadMenu />
      </Modal>
    </>
  );
};
