import { openLink } from "@/utils/openLink";
import React, { FC, PropsWithChildren, useCallback } from "react";

export type LinkProps = {
  href: string;
};

export const Link: FC<PropsWithChildren<LinkProps>> = ({ href, children }) => {
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      openLink(href);
    },
    [href]
  );

  return (
    <a className="text-(--tgui--link_color)" href={href} onClick={onClick}>
      {children}
    </a>
  );
};
