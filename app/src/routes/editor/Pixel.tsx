import { Point } from "@/model/editor";
import { usePixel } from "@/model/editor/useEditor";
import React, { FC } from "react";
import { Rect } from "react-konva";

export const Pixel: FC<{ point: Point }> = React.memo(({ point }) => {
  const { color, onEnter } = usePixel(point);
  return (
    <Rect
      x={point.x * 10}
      y={point.y * 10}
      height={10}
      width={10}
      onPointerEnter={onEnter}
      fill={color.toHex()}
    />
  );
});
