import classNames from "classnames";
import React, { FC } from "react";

export const Banner: FC<{
  title: React.ReactNode;
  description: React.ReactNode;
  button?: React.ReactNode;
}> = ({ title, description, button }) => {
  const descriptionClassName = classNames("pt-5", {
    "pb-10": button != undefined,
  });
  return (
    <div className="max-w-100 bg-(--tgui--card_bg_color) rounded-2xl p-5">
      <h1 className="text-(length:--tgui--subheadline1--font_size) leading-(--tgui--subheadline1--line_height) font-(--tgui--font_weight--accent3)">
        {title}
      </h1>
      <div className={descriptionClassName}>
        <span className="text-(length:--tgui--subheadline2--font_size) leading-(--tgui--subheadline2--line_height) text-(--tgui--hint_color)">
          {description}
        </span>
      </div>
      {button}
    </div>
  );
};
