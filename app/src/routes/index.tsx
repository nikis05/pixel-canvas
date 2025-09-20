import type { ComponentType, JSX } from "react";
import { Editor } from "./editor";
import { Feed } from "./feed";
import { Collection } from "./collection";

export type Route = {
  path: string;
  Component: ComponentType;
  title?: string;
  icon?: JSX.Element;
};

export const routes: Route[] = [
  { path: "/editor", Component: Editor },
  { path: "/feed", Component: Feed },
  { path: "/collection", Component: Collection },
];
