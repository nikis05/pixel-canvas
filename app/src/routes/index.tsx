import { Editor } from "./editor";
import { Feed } from "./feed";
import { Collection } from "./collection";
import { PathRouteProps } from "react-router-dom";

export const routes: PathRouteProps[] = [
  { path: "/editor", Component: Editor },
  { path: "/feed", Component: Feed },
  { path: "/collection", Component: Collection },
];
