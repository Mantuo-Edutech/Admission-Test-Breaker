import { Navigate } from "react-router-dom";

/** Legacy route target retained for verification manifests and old bookmarks. */
export function EsatDashboardPage() {
  return <Navigate to="/exams/esat/coverage" replace />;
}
