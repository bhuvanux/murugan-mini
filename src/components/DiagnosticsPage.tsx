/**
 * 🔍 Standalone Diagnostics Page
 * Access this page by navigating to /diagnostics in your browser
 */

import DatabaseDiagnostics from "./DatabaseDiagnostics";

export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DatabaseDiagnostics />
    </div>
  );
}
