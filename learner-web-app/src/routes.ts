import { type RouteConfig, layout, route } from "@react-router/dev/routes";

export default [
  layout("./common/layouts/dashboard.tsx", [
    route("/", "./pages/home.tsx"),
    route("/orders", "./pages/orders.tsx"),
    route("/assessment", "./pages/assessment.tsx"),
    route("/learning-path", "./pages/learning-path.tsx"),
    route("/content-discovery", "./pages/content-discovery.tsx"),
    route("/knowledge-graph", "./pages/knowledge-graph.tsx"),
    route("/concept-management", "./pages/concept-management.tsx"),
    route("/user-knowledge", "./pages/user-knowledge.tsx"),
    route("/preferences", "./pages/PreferencesSettings.tsx"),
  ]),

  // Authentication
  route("/sign-in", "./pages/sign-in.tsx"),
  route("/sign-up", "./pages/sign-up.tsx"),

  // * matches all URLs, the ? makes it optional so it will match / as well
  route("*?", "catchall.tsx"),
] satisfies RouteConfig;
