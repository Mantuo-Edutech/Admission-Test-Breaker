import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { installStaleReleaseRecovery } from "./stale-release-recovery.js";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/practice.css";

installStaleReleaseRecovery();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
