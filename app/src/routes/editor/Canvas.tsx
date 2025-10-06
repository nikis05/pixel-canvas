import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Stage, Layer } from "react-konva";
import { Pixel } from "./Pixel";
import { useEditor } from "@/model/editor/useEditor";

export const Canvas: FC = React.memo(() => {
  const sceneWidth = 640;
  const sceneHeight = 640;

  const [stageSize, setStageSize] = useState<{
    width: number;
    height: number;
    scale: number;
  }>({
    width: sceneWidth,
    height: sceneHeight,
    scale: 1,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const updateSize = useCallback(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;

    const scale = Math.floor((containerWidth / sceneWidth) * 10) / 10;

    const stageSize = {
      width: sceneWidth * scale,
      height: sceneHeight * scale,
      scale: scale,
    };

    setStageSize(stageSize);

    console.log("updating size", stageSize);
  }, [containerRef, sceneWidth, sceneHeight, setStageSize]);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);

    return () => {
      window.removeEventListener("resize", updateSize);
    };
  }, [updateSize]);

  const { onDrawStart, onDrawEnd } = useEditor();
  const points = useMemo(
    () =>
      Array.from({ length: 64 }, (_, y) =>
        Array.from({ length: 64 }, (_, x) => ({ x, y }))
      ).flat(),
    []
  );

  return (
    <div className="aspect-square h-[min(100%,_100vw)] min-w-0 min-h-0">
      <div ref={containerRef} className="w-full h-full overflow-hidden">
        <Stage
          className="flex justify-center items-center *:static"
          height={stageSize.height}
          width={stageSize.width}
          scaleX={stageSize.scale}
          scaleY={stageSize.scale}
          onPointerDown={onDrawStart}
          onPointerUp={onDrawEnd}
        >
          <Layer>
            {points.map((point) => (
              <Pixel key={`${point.x}:${point.y}`} point={point} />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
});
