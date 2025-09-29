import { FC, PropsWithChildren, ReactNode } from "react";
import { IconType } from "react-icons";

export const Section: FC<
  PropsWithChildren<{ Icon: IconType; title: string; description: ReactNode }>
> = ({ Icon, title, description, children }) => {
  return (
    <div className="flex">
      <div className="h-20 w-20 flex shrink-0 justify-center items-center">
        <div className="h-8 w-8 rounded-sm bg-(--tgui--accent_text_color) flex justify-center items-center text-white">
          <Icon />
        </div>
      </div>
      <div className="mt-4 mr-6">
        <h6 className="text-(--tgui--subheadline1--font_size) leading-(--tgui--subheadline1--line_height)">
          {title}
        </h6>
        <h6 className="text-(length:--tgui--subheadline2--font_size) leading-(--tgui--subheadline2--line_height) text-(--tgui--hint_color)">
          {description}
        </h6>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
};
