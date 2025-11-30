/**
 * ANALYTICS SETUP GUIDE
 * Step-by-step guide for setting up the unified analytics system
 */

import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert } from "../ui/alert";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  PlayCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Code,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

interface AnalyticsStatus {
  installed: boolean;
  tables: any;
  functions: any;
  config: any;
}

export function AnalyticsSetupGuide() {
  const [status, setStatus] = useState<AnalyticsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [installGuide, setInstallGuide] = useState<string>("");

  useEffect(() => {
    checkStatus();
    loadInstallGuide();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/analytics/admin/status`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const data = await response.json();
      setStatus(data.status);
    } catch (error: any) {
      console.error("[Analytics Setup] Status check error:", error);
      toast.error(`Failed to check status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadInstallGuide = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/admin/install-guide`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInstallGuide(data.guide);
      }
    } catch (error) {
      console.error("[Analytics Setup] Failed to load install guide:", error);
    }
  };

  const attemptAutoInitialize = async () => {
    setInitializing(true);
    toast.info("Attempting automatic initialization...");

    try {
      const response = await fetch(`${API_BASE}/api/analytics/admin/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Initialization failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success("Analytics system initialized!");
        await checkStatus();
      } else {
        toast.error(data.message || "Initialization failed");
      }

      console.log("[Analytics Setup] Init result:", data);
    } catch (error: any) {
      console.error("[Analytics Setup] Init error:", error);
      toast.error(`Initialization error: ${error.message}`);
    } finally {
      setInitializing(false);
    }
  };

  const copyMigrationSQL = () => {
    // Copy the migration file path to clipboard
    const migrationPath = "/MIGRATION_READY_TO_COPY.sql";
    navigator.clipboard.writeText(migrationPath);
    toast.success("Migration file path copied! Open this file and copy its contents.");
  };

  const openSupabaseSQL = () => {
    const supabaseUrl = `https://supabase.com/dashboard/project/${projectId}/sql`;
    window.open(supabaseUrl, "_blank");
    toast.info("Opening Supabase SQL Editor...");
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="size-8 animate-spin text-[#0d5e38]" />
          <span className="ml-3 text-[#0d5e38]">Checking analytics system status...</span>
        </div>
      </Card>
    );
  }

  const isFullyInstalled = status?.installed && 
    status?.tables?.analytics_tracking === "exists" &&
    status?.tables?.analytics_config === "exists" &&
    status?.functions?.get_analytics_dashboard === "exists";

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl">
            <span className="font-['Inter']">Analytics System Status</span>
          </h2>
          <Button
            onClick={checkStatus}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="space-y-3">
          {/* Overall Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              {isFullyInstalled ? (
                <CheckCircle2 className="size-6 text-green-600 mr-3" />
              ) : (
                <AlertCircle className="size-6 text-amber-600 mr-3" />
              )}
              <span className="font-medium">
                {isFullyInstalled ? "✅ Fully Installed" : "⚠️ Setup Required"}
              </span>
            </div>
            <Badge variant={isFullyInstalled ? "default" : "destructive"}>
              {isFullyInstalled ? "Ready" : "Not Ready"}
            </Badge>
          </div>

          {/* Tables Status */}
          <div className="pl-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">📊 Database Tables</span>
              <div className="flex gap-2">
                <Badge variant={status?.tables?.analytics_tracking === "exists" ? "default" : "outline"}>
                  {status?.tables?.analytics_tracking === "exists" ? "✓" : "✗"} analytics_tracking
                </Badge>
                <Badge variant={status?.tables?.analytics_config === "exists" ? "default" : "outline"}>
                  {status?.tables?.analytics_config === "exists" ? "✓" : "✗"} analytics_config
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">⚙️ RPC Functions</span>
              <Badge variant={status?.functions?.get_analytics_dashboard === "exists" ? "default" : "outline"}>
                {status?.functions?.get_analytics_dashboard === "exists" ? "✓" : "✗"} Functions
              </Badge>
            </div>

            {status?.config?.entries !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">📝 Configuration</span>
                <Badge variant="secondary">
                  {status.config.entries} events configured
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Installation Steps */}
      {!isFullyInstalled && (
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Database className="size-6 text-[#0d5e38] mr-3" />
            <h2 className="text-xl">
              <span className="font-['Inter']">Installation Required</span>
            </h2>
          </div>

          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="size-4 text-amber-600" />
            <div className="ml-3">
              <div className="font-medium text-amber-900">Manual Migration Required</div>
              <div className="text-sm text-amber-700 mt-1">
                The analytics system requires database tables and functions that must be created using SQL Editor.
              </div>
            </div>
          </Alert>

          {/* Step-by-Step Instructions */}
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="size-8 rounded-full bg-[#0d5e38] text-white flex items-center justify-center font-bold">
                  1
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Open Migration File</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Locate and open the file <code className="bg-gray-100 px-2 py-1 rounded">/MIGRATION_READY_TO_COPY.sql</code> in your project.
                </p>
                <Button onClick={copyMigrationSQL} variant="outline" size="sm">
                  <Copy className="size-4 mr-2" />
                  Copy File Path
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="size-8 rounded-full bg-[#0d5e38] text-white flex items-center justify-center font-bold">
                  2
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Open Supabase SQL Editor</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Go to your <strong>User Panel Supabase project</strong> (not Admin) and navigate to the SQL Editor.
                </p>
                <Button onClick={openSupabaseSQL} variant="outline" size="sm">
                  <ExternalLink className="size-4 mr-2" />
                  Open SQL Editor
                </Button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="size-8 rounded-full bg-[#0d5e38] text-white flex items-center justify-center font-bold">
                  3
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Copy & Paste SQL</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Copy the <strong>ENTIRE contents</strong> of the migration file and paste it into the SQL Editor.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="size-8 rounded-full bg-[#0d5e38] text-white flex items-center justify-center font-bold">
                  4
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Run Migration</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Click the <strong>RUN</strong> button in Supabase SQL Editor and wait for the success message.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="size-8 rounded-full bg-[#0d5e38] text-white flex items-center justify-center font-bold">
                  5
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Verify Installation</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Return to this page and click "Refresh" to verify all components are installed correctly.
                </p>
                <Button onClick={checkStatus} className="bg-[#0d5e38] hover:bg-[#0a4a2a]">
                  <CheckCircle2 className="size-4 mr-2" />
                  Verify Installation
                </Button>
              </div>
            </div>
          </div>

          {/* Optional: Auto-init button (may not work due to RLS) */}
          <div className="mt-8 pt-6 border-t">
            <div className="flex items-start gap-4">
              <AlertCircle className="size-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Alternative:</strong> You can attempt automatic initialization, but this may fail due to database permissions. Manual migration is recommended.
                </p>
                <Button
                  onClick={attemptAutoInitialize}
                  variant="outline"
                  size="sm"
                  disabled={initializing}
                >
                  <PlayCircle className={`size-4 mr-2 ${initializing ? "animate-spin" : ""}`} />
                  {initializing ? "Initializing..." : "Try Auto-Initialize"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Success State */}
      {isFullyInstalled && (
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center mb-4">
            <CheckCircle2 className="size-8 text-green-600 mr-3" />
            <div>
              <h2 className="text-xl font-['Inter'] text-green-900">
                Analytics System Ready!
              </h2>
              <p className="text-sm text-green-700 mt-1">
                All components are installed and functioning correctly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{status?.config?.entries || 0}</div>
              <div className="text-sm text-gray-600">Event Types Configured</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-sm text-gray-600">IP-Based Tracking Active</div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => window.location.href = "#analytics-testing"}
              className="bg-[#0d5e38] hover:bg-[#0a4a2a]"
            >
              <PlayCircle className="size-4 mr-2" />
              Run Test Suite
            </Button>
            <Button onClick={checkStatus} variant="outline">
              <RefreshCw className="size-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </Card>
      )}

      {/* Installation Guide (Expandable) */}
      {installGuide && !isFullyInstalled && (
        <Card className="p-6">
          <details className="cursor-pointer">
            <summary className="flex items-center font-semibold mb-2">
              <BookOpen className="size-5 mr-2 text-[#0d5e38]" />
              <span className="font-['TAU-Paalai_Bold']">View Complete Installation Guide</span>
            </summary>
            <pre className="mt-4 p-4 bg-gray-50 rounded-lg text-xs overflow-x-auto border">
              {installGuide}
            </pre>
          </details>
        </Card>
      )}
    </div>
  );
}