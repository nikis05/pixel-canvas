import { Color } from "@/model/editor";
import classNames from "classnames";
import { FC, useMemo } from "react";

export const BrushPicker: FC<{
  brushSize: number;
  onBrushSizeChange: (brushSize: number) => void;
  color: Color;
  onColorChange: (value: Color) => void;
}> = ({ brushSize, onBrushSizeChange, color, onColorChange }) => {
  const palette = useMemo(() => Color.palette(), [Color]);

  const brushSizes = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);

  const onBrushClick = useMemo(
    () => brushSizes.map((brushSize) => () => onBrushSizeChange(brushSize)),
    [brushSizes]
  );

  const onColorClick = useMemo(
    () => new Map(palette.map((color) => [color, () => onColorChange(color)])),
    [palette, onColorChange]
  );

  const rows = useMemo(
    () =>
      Array.from({ length: Math.ceil(palette.length / 8) }, (_, i) =>
        palette.slice(i * 8, i * 8 + 8)
      ),
    [palette]
  );

  return (
    <div className="h-full w-full flex flex-col items-center">
      <div className="flex-1 flex">
        {brushSizes.map((i) => {
          const className = classNames(
            "flex-1",
            "aspect-square",
            "bg-(--tgui--surface_primary)",
            "flex",
            "justify-center",
            "items-center",
            {
              "shadow-[inset_0_0_0_2px_var(--tgui--link_color)]":
                i == brushSize,
            }
          );
          return (
            <button key={i} className={className} onClick={onBrushClick[i]}>
              {i + 1}
            </button>
          );
        })}
      </div>
      {rows.map((row, i) => (
        <div key={i} className="flex-1 flex">
          {row.map((cellColor) => {
            const isSelected = cellColor.is(color);
            const colorHex = cellColor.toHex();
            const className = classNames(
              "flex-1",
              "aspect-square",
              "relative",
              ...(isSelected
                ? [
                    "before:content-['']",
                    "before:absolute",
                    "before:inset-0",
                    "before:bg-transparent",
                    "before:shadow-[inset_0_0_0_2px_white]",
                    "before:mix-blend-difference",
                    "before:pointer-events-none",
                  ]
                : [])
            );

            return (
              <button
                key={colorHex}
                className={className}
                onClick={onColorClick.get(cellColor)}
                style={{ backgroundColor: colorHex }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
