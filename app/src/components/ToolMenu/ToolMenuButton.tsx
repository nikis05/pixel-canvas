import React, { FC } from "react";
import { IconType } from "react-icons";
import classNames from "classnames";

type ToolMenuButtonPropsBase = {
  text?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: VoidFunction;
  primary?: boolean;
};

export type ToolMenuButtonProps = ToolMenuButtonPropsBase &
  ({ Icon: IconType } | { renderIcon: (active: boolean) => React.ReactNode });

export const ToolMenuButton: FC<ToolMenuButtonProps> = (props) => {
  const { active = false, onClick, disabled, text, primary = false } = props;

  const className = classNames(
    "cursor-pointer",
    "m-0.5",
    "h-7",
    "rounded-sm",
    "flex",
    "justify-center",
    "items-center",
    "group",
    {
      "w-7": text == undefined,
      "pl-2": text !== undefined,
      "pr-2": text !== undefined,
      "font-(--tgui--font_weight--accent2)": text !== undefined,
      "bg-(--tgui--secondary_fill)": primary || (active && disabled !== true),
      "hover:bg-(--tgui--secondary_fill)":
        !primary && !active && disabled !== true,
      "brightness-125": primary && active && disabled !== true,
      "hover:brightness-125": primary && !active && disabled !== true,
    }
  );

  return (
    <button
      className={className}
      onClick={disabled == true ? undefined : onClick}
    >
      {disabled == true ? null : "Icon" in props ? (
        <props.Icon
          className={
            active
              ? "text-(--tgui--link_color)"
              : "group-hover:text-(--tgui--link_color)"
          }
        />
      ) : (
        props.renderIcon(active)
      )}
      {text !== undefined && <span className="ml-2">{text}</span>}
    </button>
  );
};
