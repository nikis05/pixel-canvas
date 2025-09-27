import React, { FC, useMemo } from "react";
import { Stage, Layer } from "react-konva";
import { Pixel } from "./Pixel";
import { useEditor } from "@/model/editor/useEditor";

export const Canvas: FC = React.memo(() => {
  const { onDrawStart, onDrawEnd } = useEditor();
  const points = useMemo(
    () =>
      Array.from({ length: 64 }, (_, y) =>
        Array.from({ length: 64 }, (_, x) => ({ x, y }))
      ).flat(),
    []
  );

  return (
    <div className="aspect-square border border-black">
      <Stage
        height={640}
        width={640}
        onPointerDown={onDrawStart}
        onPoinerUp={onDrawEnd}
      >
        <Layer>
          {points.map((point) => (
            <Pixel key={`${point.x}:${point.y}`} point={point} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
});
