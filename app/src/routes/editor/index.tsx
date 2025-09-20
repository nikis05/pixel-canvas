import { FC } from "react";
import { EditorMenu } from "./EditorMenu";
import { Canvas } from "./Canvas";

export const Editor: FC = () => {
  return (
    <div className="h-full flex flex-col">
      <EditorMenu />
      <div className="flex-1 flex justify-center items-center">
        <Canvas />
      </div>
    </div>
  );
};
