import { type RouteConfig, layout, route } from "@react-router/dev/routes";

/**
 * Simplified Route Structure
 *
 * 5 core sections:
 * - / (Home) - Dashboard with guidance
 * - /learn - Learning paths and progress
 * - /practice - Quizzes and assessments
 * - /discover - Content discovery
 * - /profile - User settings and knowledge
 *
 * Legacy routes kept for backward compatibility
 */
export default [
  layout("./common/layouts/dashboard.tsx", [
    // Core routes (new simplified structure)
    route("/", "./pages/home.tsx"),
    route("/learn", "./pages/learn.tsx"),
    route("/practice", "./pages/practice.tsx"),
    route("/discover", "./pages/discover.tsx"),
    route("/profile", "./pages/profile.tsx"),

    // Legacy routes (redirect or keep for deep links)
    route("/learning-path", "./pages/learning-path.tsx"),
    route("/assessment", "./pages/assessment.tsx"),
    route("/content-discovery", "./pages/content-discovery.tsx"),
    route("/knowledge-graph", "./pages/knowledge-graph.tsx"),
    route("/user-knowledge", "./pages/user-knowledge.tsx"),
    route("/preferences", "./pages/PreferencesSettings.tsx"),
  ]),

  // Authentication
  route("/sign-in", "./pages/sign-in.tsx"),
  route("/sign-up", "./pages/sign-up.tsx"),

  // * matches all URLs, the ? makes it optional so it will match / as well
  route("*?", "catchall.tsx"),
] satisfies RouteConfig;
