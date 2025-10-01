import { FC } from "react";
import { EditorMenu } from "./EditorMenu";
import { Canvas } from "./Canvas";
import { Page } from "@/components/Page";

export const Editor: FC = () => {
  return (
    <Page back={false}>
      <div className="h-full flex flex-col">
        <EditorMenu />
        <div className="flex-1 flex justify-center items-center">
          <Canvas />
        </div>
      </div>
    </Page>
  );
};
