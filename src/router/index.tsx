import { createBrowserRouter } from "react-router";

import { createAppRoutes } from "./tree";

export const router = createBrowserRouter(createAppRoutes());
