import { FC, PropsWithChildren, ReactNode } from "react";
import { IconType } from "react-icons";

type SectionPropsBase = {
  title: string;
  description: ReactNode;
};

export type SectionProps = SectionPropsBase &
  ({ Icon: IconType } | { renderIcon: () => React.ReactNode });

export const Section: FC<PropsWithChildren<SectionProps>> = (props) => {
  const { title, description, children } = props;
  return (
    <div className="flex">
      <div className="h-20 w-20 flex shrink-0 justify-center items-center">
        {"Icon" in props ? (
          <div className="h-8 w-8 rounded-sm bg-(--tgui--accent_text_color) flex justify-center items-center text-white">
            <props.Icon />
          </div>
        ) : (
          props.renderIcon()
        )}
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
