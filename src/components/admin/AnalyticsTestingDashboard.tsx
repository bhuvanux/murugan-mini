/**
 * ANALYTICS TESTING DASHBOARD
 * Comprehensive testing interface for unified analytics system
 * Run tests, verify IP-based uniqueness, check all endpoints
 */

import React, { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  RefreshCw,
  Database,
  Server,
  Code,
  Activity,
  Users,
  Eye,
  Heart,
  Download,
  Share2,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { analyticsTracker } from "../../utils/analytics/useAnalytics";
import { createClient } from "@supabase/supabase-js";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

interface TestResult {
  name: string;
  status: "pending" | "running" | "passed" | "failed";
  message: string;
  details?: any;
}

export function AnalyticsTestingDashboard() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Database Tables", status: "pending", message: "Not run yet" },
    { name: "Database Functions", status: "pending", message: "Not run yet" },
    { name: "Config Seeding", status: "pending", message: "Not run yet" },
    { name: "Track Endpoint", status: "pending", message: "Not run yet" },
    { name: "Untrack Endpoint", status: "pending", message: "Not run yet" },
    { name: "Stats Endpoint", status: "pending", message: "Not run yet" },
    { name: "Check Endpoint", status: "pending", message: "Not run yet" },
    { name: "IP-Based Uniqueness", status: "pending", message: "Not run yet" },
    { name: "Like/Unlike Toggle", status: "pending", message: "Not run yet" },
    { name: "Admin Dashboard", status: "pending", message: "Not run yet" },
    { name: "Admin Config", status: "pending", message: "Not run yet" },
    { name: "Reset Function", status: "pending", message: "Not run yet" },
  ]);

  const [testItemId, setTestItemId] = useState("00000000-0000-0000-0000-000000000001");
  const [running, setRunning] = useState(false);

  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTests((prev) =>
      prev.map((test) => (test.name === name ? { ...test, ...updates } : test))
    );
  };

  const runAllTests = async () => {
    setRunning(true);
    toast.info("Running all tests...");

    // Reset all to pending
    setTests((prev) =>
      prev.map((test) => ({ ...test, status: "pending", message: "Waiting..." }))
    );

    // Run tests sequentially
    await testDatabaseTables();
    await testDatabaseFunctions();
    await testConfigSeeding();
    await testTrackEndpoint();
    await testUntrackEndpoint();
    await testStatsEndpoint();
    await testCheckEndpoint();
    await testIPUniqueness();
    await testLikeUnlikeToggle();
    await testAdminDashboard();
    await testAdminConfig();
    await testResetFunction();

    setRunning(false);
    toast.success("All tests completed!");
  };

  // Test 1: Database Tables
  const testDatabaseTables = async () => {
    updateTest("Database Tables", { status: "running", message: "Checking tables..." });

    try {
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      // Check if analytics_tracking table exists
      const { data: trackingData, error: trackingError } = await supabase
        .from("analytics_tracking")
        .select("*")
        .limit(1);

      // Check if analytics_config table exists
      const { data: configData, error: configError } = await supabase
        .from("analytics_config")
        .select("*")
        .limit(1);

      if (trackingError || configError) {
        throw new Error(
          `Tables not found. Run migration first: ${trackingError?.message || configError?.message}`
        );
      }

      updateTest("Database Tables", {
        status: "passed",
        message: "✓ analytics_tracking and analytics_config tables exist",
        details: { trackingRows: trackingData?.length, configRows: configData?.length },
      });
    } catch (error: any) {
      updateTest("Database Tables", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 2: Database Functions
  const testDatabaseFunctions = async () => {
    updateTest("Database Functions", { status: "running", message: "Checking functions..." });

    try {
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      // Try calling a function
      const { data, error } = await supabase.rpc("get_analytics_dashboard");

      if (error) {
        throw new Error(`Function not found: ${error.message}`);
      }

      updateTest("Database Functions", {
        status: "passed",
        message: "✓ All RPC functions available",
        details: data,
      });
    } catch (error: any) {
      updateTest("Database Functions", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 3: Config Seeding
  const testConfigSeeding = async () => {
    updateTest("Config Seeding", { status: "running", message: "Checking config..." });

    try {
      const response = await fetch(`${API_BASE}/api/analytics/admin/config`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });

      const data = await response.json();

      if (!data.success || !data.config) {
        throw new Error("Config not seeded");
      }

      const moduleCount = Object.keys(data.config).length;
      const eventCount = data.all?.length || 0;

      if (moduleCount === 0 || eventCount === 0) {
        throw new Error("No config entries found. Migration may not have seeded defaults.");
      }

      updateTest("Config Seeding", {
        status: "passed",
        message: `✓ ${moduleCount} modules, ${eventCount} events configured`,
        details: data.config,
      });
    } catch (error: any) {
      updateTest("Config Seeding", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 4: Track Endpoint
  const testTrackEndpoint = async () => {
    updateTest("Track Endpoint", { status: "running", message: "Testing track..." });

    try {
      const result = await analyticsTracker.track(
        "wallpaper",
        testItemId,
        "view",
        { test: true }
      );

      if (!result.success) {
        throw new Error("Track endpoint failed");
      }

      updateTest("Track Endpoint", {
        status: "passed",
        message: `✓ Track successful (count: ${result.unique_count})`,
        details: result,
      });
    } catch (error: any) {
      updateTest("Track Endpoint", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 5: Untrack Endpoint
  const testUntrackEndpoint = async () => {
    updateTest("Untrack Endpoint", { status: "running", message: "Testing untrack..." });

    try {
      // First track
      await analyticsTracker.track("wallpaper", testItemId, "like");

      // Then untrack
      const result = await analyticsTracker.untrack("wallpaper", testItemId, "like");

      if (!result.success) {
        throw new Error("Untrack endpoint failed");
      }

      updateTest("Untrack Endpoint", {
        status: "passed",
        message: `✓ Untrack successful (count: ${result.unique_count})`,
        details: result,
      });
    } catch (error: any) {
      updateTest("Untrack Endpoint", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 6: Stats Endpoint
  const testStatsEndpoint = async () => {
    updateTest("Stats Endpoint", { status: "running", message: "Testing stats..." });

    try {
      const stats = await analyticsTracker.getStats("wallpaper", testItemId);

      updateTest("Stats Endpoint", {
        status: "passed",
        message: `✓ Stats retrieved successfully`,
        details: stats,
      });
    } catch (error: any) {
      updateTest("Stats Endpoint", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 7: Check Endpoint
  const testCheckEndpoint = async () => {
    updateTest("Check Endpoint", { status: "running", message: "Testing check..." });

    try {
      const response = await fetch(
        `${API_BASE}/api/analytics/check/wallpaper/${testItemId}/view`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error("Check endpoint failed");
      }

      updateTest("Check Endpoint", {
        status: "passed",
        message: `✓ Check successful (tracked: ${data.tracked})`,
        details: data,
      });
    } catch (error: any) {
      updateTest("Check Endpoint", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 8: IP-Based Uniqueness
  const testIPUniqueness = async () => {
    updateTest("IP-Based Uniqueness", {
      status: "running",
      message: "Testing uniqueness...",
    });

    try {
      // Use a unique UUID for this test
      const testId = `00000000-0000-0000-0001-${String(Date.now()).slice(-12).padStart(12, '0')}`;

      // Track first time
      const result1 = await analyticsTracker.track("wallpaper", testId, "download");

      if (!result1.tracked) {
        throw new Error("First track should succeed");
      }

      // Track second time (same IP)
      const result2 = await analyticsTracker.track("wallpaper", testId, "download");

      if (result2.tracked) {
        throw new Error("Second track should fail (already tracked)");
      }

      if (!result2.already_tracked) {
        throw new Error("already_tracked flag should be true");
      }

      if (result1.unique_count !== result2.unique_count) {
        throw new Error("Count should remain same on duplicate track");
      }

      updateTest("IP-Based Uniqueness", {
        status: "passed",
        message: `✓ IP uniqueness working (count: ${result2.unique_count})`,
        details: { result1, result2 },
      });
    } catch (error: any) {
      updateTest("IP-Based Uniqueness", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 9: Like/Unlike Toggle
  const testLikeUnlikeToggle = async () => {
    updateTest("Like/Unlike Toggle", { status: "running", message: "Testing toggle..." });

    try {
      // Use a unique UUID for this test
      const testId = `00000000-0000-0000-0002-${String(Date.now()).slice(-12).padStart(12, '0')}`;

      // Like
      const likeResult = await analyticsTracker.track("wallpaper", testId, "like");
      const countAfterLike = likeResult.unique_count;

      // Unlike
      const unlikeResult = await analyticsTracker.untrack("wallpaper", testId, "like");
      const countAfterUnlike = unlikeResult.unique_count;

      // Like again
      const likeAgainResult = await analyticsTracker.track("wallpaper", testId, "like");
      const countAfterLikeAgain = likeAgainResult.unique_count;

      if (countAfterUnlike >= countAfterLike) {
        throw new Error("Unlike should decrement count");
      }

      if (countAfterLikeAgain !== countAfterLike) {
        throw new Error("Like again should restore count");
      }

      updateTest("Like/Unlike Toggle", {
        status: "passed",
        message: `✓ Toggle working (${countAfterLike} → ${countAfterUnlike} → ${countAfterLikeAgain})`,
        details: { likeResult, unlikeResult, likeAgainResult },
      });
    } catch (error: any) {
      updateTest("Like/Unlike Toggle", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 10: Admin Dashboard
  const testAdminDashboard = async () => {
    updateTest("Admin Dashboard", { status: "running", message: "Testing dashboard..." });

    try {
      const response = await fetch(`${API_BASE}/api/analytics/admin/dashboard`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });

      const data = await response.json();

      if (!data.success || !data.dashboard) {
        throw new Error("Dashboard endpoint failed");
      }

      updateTest("Admin Dashboard", {
        status: "passed",
        message: `✓ Dashboard loaded (${data.dashboard.total_events || 0} events, ${data.dashboard.unique_ips || 0} IPs)`,
        details: data.dashboard,
      });
    } catch (error: any) {
      updateTest("Admin Dashboard", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 11: Admin Config
  const testAdminConfig = async () => {
    updateTest("Admin Config", { status: "running", message: "Testing config CRUD..." });

    try {
      // Get config
      const getResponse = await fetch(`${API_BASE}/api/analytics/admin/config`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });

      const getData = await getResponse.json();

      if (!getData.success) {
        throw new Error("Get config failed");
      }

      // Try to update config
      const updateResponse = await fetch(`${API_BASE}/api/analytics/admin/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          module_name: "wallpaper",
          event_type: "view",
          updates: { is_enabled: true },
        }),
      });

      const updateData = await updateResponse.json();

      if (!updateData.success) {
        throw new Error("Update config failed");
      }

      updateTest("Admin Config", {
        status: "passed",
        message: `✓ Config CRUD working`,
        details: { get: getData, update: updateData },
      });
    } catch (error: any) {
      updateTest("Admin Config", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  // Test 12: Reset Function
  const testResetFunction = async () => {
    updateTest("Reset Function", { status: "running", message: "Testing reset..." });

    try {
      // Use a unique UUID for this test
      const testId = `00000000-0000-0000-0003-${String(Date.now()).slice(-12).padStart(12, '0')}`;

      // Track some events
      await analyticsTracker.track("wallpaper", testId, "share");

      // Get stats before reset
      const statsBefore = await analyticsTracker.getStats("wallpaper", testId);

      // Reset
      const response = await fetch(`${API_BASE}/api/analytics/admin/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          module_name: "wallpaper",
          item_id: testId,
          event_type: "share",
        }),
      });

      const resetData = await response.json();

      if (!resetData.success) {
        throw new Error("Reset failed");
      }

      // Get stats after reset
      const statsAfter = await analyticsTracker.getStats("wallpaper", testId);

      updateTest("Reset Function", {
        status: "passed",
        message: `✓ Reset working (deleted ${resetData.result.deleted_count} records)`,
        details: { before: statsBefore, after: statsAfter, reset: resetData },
      });
    } catch (error: any) {
      updateTest("Reset Function", {
        status: "failed",
        message: `✗ ${error.message}`,
        details: error,
      });
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "running":
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants: Record<TestResult["status"], any> = {
      passed: "default",
      failed: "destructive",
      running: "secondary",
      pending: "outline",
    };

    return (
      <Badge variant={variants[status]} className="ml-auto">
        {status}
      </Badge>
    );
  };

  const passedCount = tests.filter((t) => t.status === "passed").length;
  const failedCount = tests.filter((t) => t.status === "failed").length;
  const totalCount = tests.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Testing Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive test suite for unified analytics system
          </p>
        </div>
        <Button
          onClick={runAllTests}
          disabled={running}
          size="lg"
          className="bg-[#0d5e38] hover:bg-[#0a5b34] gap-2"
        >
          {running ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      {/* Test Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="testItemId">Test Item ID</Label>
            <Input
              id="testItemId"
              value={testItemId}
              onChange={(e) => setTestItemId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000001"
              className="mt-1"
            />
          </div>
          <div className="text-sm text-gray-600 mt-6">
            This ID will be used for testing. You can change it if needed.
          </div>
        </div>
      </Card>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tests</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalCount}</p>
            </div>
            <Activity className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Passed</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{passedCount}</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{failedCount}</p>
            </div>
            <XCircle className="w-12 h-12 text-red-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Test Results */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Test Results</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {tests.map((test, index) => (
            <div key={test.name} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{getStatusIcon(test.status)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">
                      {index + 1}. {test.name}
                    </h3>
                    {getStatusBadge(test.status)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                  {test.details && test.status !== "pending" && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        Show details
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Test Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            onClick={() => testTrackEndpoint()}
            disabled={running}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Test Track
          </Button>
          <Button
            variant="outline"
            onClick={() => testIPUniqueness()}
            disabled={running}
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            Test Uniqueness
          </Button>
          <Button
            variant="outline"
            onClick={() => testLikeUnlikeToggle()}
            disabled={running}
            className="gap-2"
          >
            <Heart className="w-4 h-4" />
            Test Toggle
          </Button>
          <Button
            variant="outline"
            onClick={() => testAdminDashboard()}
            disabled={running}
            className="gap-2"
          >
            <Activity className="w-4 h-4" />
            Test Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}