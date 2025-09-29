import { FC } from "react";
import { ToolMenuButton, ToolMenuButtonProps } from "./ToolMenuButton";

export type ToolMenuProps = {
  items: (ItemOptions | "divider")[];
};

export type ItemOptions = ToolMenuButtonProps & { key: string };

export const ToolMenu: FC<ToolMenuProps> = ({ items: buttons }) => {
  return (
    <div className="shadow-[0_1px_0_var(--tgui--divider)] bg-(--tgui--surface_primary) p-1 flex">
      {buttons.map((button, i) => {
        if (button == "divider")
          return <div key={`div-${i}`} className="flex-1" />;

        const { key, ...rest } = button;
        return <ToolMenuButton key={key} {...rest} />;
      })}
    </div>
  );
};
