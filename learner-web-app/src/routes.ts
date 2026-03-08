import { type RouteConfig, layout, route } from "@react-router/dev/routes";

export default [
  layout("./common/layouts/dashboard.tsx", [
    route("/", "./pages/home.tsx"),
    route("/learn", "./pages/learn.tsx"),
    route("/practice", "./pages/practice.tsx"),
    route("/discover", "./pages/discover.tsx"),
    route("/profile", "./pages/profile.tsx"),
    route("/learning-path", "./pages/learning-path.tsx"),
    route("/assessment", "./pages/assessment.tsx"),
    route("/preferences", "./pages/PreferencesSettings.tsx"),
  ]),

  route("/sign-in", "./pages/sign-in.tsx"),
  route("/sign-up", "./pages/sign-up.tsx"),
] satisfies RouteConfig;
