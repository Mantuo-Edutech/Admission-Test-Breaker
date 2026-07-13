import { RouterProvider } from "react-router-dom";
import { createAppRouter } from "./routes.js";

const router = createAppRouter();

export function App() {
  return <RouterProvider router={router} />;
}
