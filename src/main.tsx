import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { ErrorBoundary } from "./components/ErrorBoundary";

// Import GA4 test and debug tools
import "./utils/analytics/run-ga4-test";
import "./utils/analytics/debug-ga4";

console.log("🚀 APP STARTING - MOUNTING ROOT");
try {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (e) {
  console.error("Root Render Error:", e);
  alert("Root Render Error: " + e);
}
