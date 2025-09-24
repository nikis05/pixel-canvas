import React, { FC } from "react";
import { IconType } from "react-icons";
import classNames from "classnames";

type ToolMenuButtonPropsBase = {
  active?: boolean;
  disabled?: boolean;
  onClick?: VoidFunction;
};

export type ToolMenuButtonProps = ToolMenuButtonPropsBase &
  ({ Icon: IconType } | { renderIcon: (active: boolean) => React.ReactNode });

export const ToolMenuButton: FC<ToolMenuButtonProps> = (props) => {
  const { active, onClick, disabled } = props;

  const className = classNames(
    "m-0.5",
    "h-7",
    "w-7",
    "rounded-sm",
    "flex",
    "justify-center",
    "items-center",
    "group",
    {
      "bg-(--tgui--secondary_fill)": active && !disabled,
      "hover:bg-(--tgui--secondary_fill)": !active && !disabled,
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
        props.renderIcon(active ?? false)
      )}
    </button>
  );
};
