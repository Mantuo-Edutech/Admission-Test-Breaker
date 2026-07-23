import { Navigate } from "react-router-dom";

/** Legacy route target retained for verification manifests and old bookmarks. */
export function TmuaDashboardPage() {
  return <Navigate to="/exams/tmua/coverage" replace />;
}
