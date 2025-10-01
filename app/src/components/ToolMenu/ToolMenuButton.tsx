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
      "w-7": !text,
      "pl-2": !!text,
      "pr-2": !!text,
      "font-(--tgui--font_weight--accent2)": !!text,
      "bg-(--tgui--secondary_fill)": primary || (active && !disabled),
      "hover:bg-(--tgui--secondary_fill)": !primary && !active && !disabled,
      "brightness-125": primary && active && !disabled,
      "hover:brightness-125": primary && !active && !disabled,
    }
  );

  return (
    <button className={className} onClick={disabled ? undefined : onClick}>
      {disabled ? null : "Icon" in props ? (
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
      {text && <span className="ml-2">{text}</span>}
    </button>
  );
};
