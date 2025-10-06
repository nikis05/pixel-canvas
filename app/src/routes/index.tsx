import { Editor } from "./editor";
import { Feed } from "./feed";
import { Collection } from "./collection";
import { PathRouteProps } from "react-router-dom";
import { Exclusives } from "./exclusives/Exclusives";

export const routes: PathRouteProps[] = [
  { path: "/editor", Component: Editor },
  { path: "/feed", Component: Feed },
  { path: "/collection", Component: Collection },
  { path: "/exclusives", Component: Exclusives },
];
