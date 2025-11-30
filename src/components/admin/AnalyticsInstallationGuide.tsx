/**
 * ANALYTICS INSTALLATION & VERIFICATION GUIDE
 * Step-by-step guide for installing unified analytics system
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { 
  CheckCircle2, XCircle, AlertCircle, Loader2, 
  Copy, ExternalLink, Database, Play, RefreshCw,
  FileCode, Terminal, CheckCheck
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface VerificationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'checking' | 'passed' | 'failed';
  error?: string;
  details?: any;
}

export default function AnalyticsInstallationGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [migrationCopied, setMigrationCopied] = useState(false);
  
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([
    {
      id: 'tables',
      name: 'Database Tables',
      description: 'Check if analytics_tracking and analytics_config tables exist',
      status: 'pending'
    },
    {
      id: 'functions',
      name: 'RPC Functions',
      description: 'Verify all tracking functions are installed',
      status: 'pending'
    },
    {
      id: 'config',
      name: 'Configuration Data',
      description: 'Check if event configurations are seeded',
      status: 'pending'
    },
    {
      id: 'api',
      name: 'API Endpoints',
      description: 'Test analytics API connectivity',
      status: 'pending'
    },
    {
      id: 'tracking',
      name: 'Tracking System',
      description: 'Test event tracking functionality',
      status: 'pending'
    }
  ]);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

  const migrationPath = '/MIGRATION_READY_TO_COPY.sql';

  const installationSteps = [
    {
      step: 1,
      title: 'Open Supabase Dashboard',
      description: 'Navigate to your User Panel Supabase project',
      action: (
        <Button 
          onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
          variant="outline"
          size="sm"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Supabase
        </Button>
      )
    },
    {
      step: 2,
      title: 'Go to SQL Editor',
      description: 'Click on "SQL Editor" in the left sidebar',
      action: null
    },
    {
      step: 3,
      title: 'Copy Migration File',
      description: 'Copy the entire migration SQL file',
      action: (
        <Button 
          onClick={copyMigrationCode}
          variant="outline"
          size="sm"
        >
          <Copy className="h-4 w-4 mr-2" />
          {migrationCopied ? 'Copied!' : 'Copy Migration SQL'}
        </Button>
      )
    },
    {
      step: 4,
      title: 'Paste & Run',
      description: 'Paste the SQL into Supabase SQL Editor and click RUN',
      action: null
    },
    {
      step: 5,
      title: 'Verify Installation',
      description: 'Run verification tests to confirm everything works',
      action: (
        <Button 
          onClick={runVerification}
          disabled={verifying}
        >
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCheck className="h-4 w-4 mr-2" />
              Verify Installation
            </>
          )}
        </Button>
      )
    }
  ];

  async function copyMigrationCode() {
    try {
      // Fetch the migration file content
      const response = await fetch(migrationPath);
      const sql = await response.text();
      
      await navigator.clipboard.writeText(sql);
      setMigrationCopied(true);
      
      setTimeout(() => setMigrationCopied(false), 3000);
    } catch (error) {
      alert('Failed to copy migration code. Please copy it manually from the file.');
    }
  }

  async function runVerification() {
    setVerifying(true);
    
    // Reset all steps
    setVerificationSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending' as const,
      error: undefined,
      details: undefined
    })));

    const steps = [...verificationSteps];

    // Step 1: Check Tables
    await verifyStep(0, async () => {
      const res = await fetch(`${baseUrl}/api/analytics/admin/status`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      
      if (!data.success || !data.status?.tables) {
        throw new Error('Status check failed');
      }

      const hasTracking = data.status.tables.analytics_tracking === 'exists';
      const hasConfig = data.status.tables.analytics_config === 'exists';

      if (!hasTracking || !hasConfig) {
        throw new Error(`Missing tables: ${!hasTracking ? 'analytics_tracking ' : ''}${!hasConfig ? 'analytics_config' : ''}`);
      }

      return data.status.tables;
    });

    // Step 2: Check Functions
    await verifyStep(1, async () => {
      const res = await fetch(`${baseUrl}/api/analytics/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error('Dashboard function failed - RPC functions may not exist');
      }

      return { dashboard_accessible: true };
    });

    // Step 3: Check Configuration
    await verifyStep(2, async () => {
      const res = await fetch(`${baseUrl}/api/analytics/admin/config`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      
      if (!data.success || !data.all || data.all.length === 0) {
        throw new Error('No event configurations found - migration may not have seeded data');
      }

      return { config_count: data.all.length };
    });

    // Step 4: Check API Endpoints
    await verifyStep(3, async () => {
      const testItemId = '00000000-0000-0000-0000-000000000001';
      
      // Test stats endpoint
      const res = await fetch(
        `${baseUrl}/api/analytics/stats/wallpaper/${testItemId}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await res.json();
      
      if (!data.success) {
        throw new Error('Stats endpoint failed');
      }

      return { stats_endpoint: 'working' };
    });

    // Step 5: Test Tracking
    await verifyStep(4, async () => {
      const testItemId = '00000000-0000-0000-0000-000000000999';
      
      // Track a test event
      const trackRes = await fetch(`${baseUrl}/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'view',
          metadata: { test: 'installation_verification' }
        })
      });

      const trackData = await trackRes.json();
      
      if (!trackData.success) {
        throw new Error('Track event failed');
      }

      // Verify it was tracked
      const checkRes = await fetch(
        `${baseUrl}/api/analytics/check/wallpaper/${testItemId}/view`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      const checkData = await checkRes.json();
      
      if (!checkData.tracked) {
        throw new Error('Event was not persisted');
      }

      return { tracking: 'working', test_tracked: true };
    });

    setVerifying(false);
  }

  async function verifyStep(index: number, checkFn: () => Promise<any>) {
    setVerificationSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status: 'checking' as const } : step
    ));

    try {
      const details = await checkFn();
      
      setVerificationSteps(prev => prev.map((step, i) => 
        i === index ? { ...step, status: 'passed' as const, details } : step
      ));

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      setVerificationSteps(prev => prev.map((step, i) => 
        i === index ? { ...step, status: 'failed' as const, error: error.message } : step
      ));
    }
  }

  const allPassed = verificationSteps.every(step => step.status === 'passed');
  const anyFailed = verificationSteps.some(step => step.status === 'failed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics System Installation</h2>
        <p className="text-gray-600 mt-1">
          Step-by-step guide to set up unified analytics tracking
        </p>
      </div>

      {/* Status Alert */}
      {allPassed && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>✅ Analytics System Fully Operational!</strong>
            <p className="mt-2">All verification checks passed. Your analytics system is ready to use.</p>
          </AlertDescription>
        </Alert>
      )}

      {anyFailed && !verifying && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Installation Incomplete</strong>
            <p className="mt-2">Some verification checks failed. Please follow the installation steps below.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Installation Steps */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-gray-600" />
          Installation Steps
        </h3>

        <div className="space-y-4">
          {installationSteps.map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  currentStep >= item.step 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > item.step ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    item.step
                  )}
                </div>
              </div>

              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                {item.action && (
                  <div className="mt-3">
                    {item.action}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <Button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            variant="outline"
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <Button
            onClick={() => setCurrentStep(Math.min(installationSteps.length, currentStep + 1))}
            disabled={currentStep === installationSteps.length}
          >
            Next Step
          </Button>
        </div>
      </Card>

      {/* Migration Code Preview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileCode className="h-5 w-5 text-gray-600" />
          Migration SQL File
        </h3>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400">File: {migrationPath}</span>
            <Button onClick={copyMigrationCode} size="sm" variant="outline" className="bg-gray-800 border-gray-700 text-gray-100 hover:bg-gray-700">
              <Copy className="h-3 w-3 mr-2" />
              {migrationCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          
          <pre className="text-xs leading-relaxed">
{`-- ============================================================================
-- UNIFIED ANALYTICS SYSTEM - MIGRATION SCRIPT
-- Copy this ENTIRE file and paste into Supabase SQL Editor
-- Then click RUN
-- ============================================================================

-- Drop old analytics tables and triggers if they exist
DROP TABLE IF EXISTS analytics_tracking CASCADE;
DROP TABLE IF EXISTS analytics_config CASCADE;
...

-- See full file at: ${migrationPath}`}
          </pre>
        </div>

        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Make sure you're running this in your <strong>User Panel Supabase</strong> project, 
            not the Admin Backend project. The migration file is located at <code>{migrationPath}</code> in your project root.
          </AlertDescription>
        </Alert>
      </Card>

      {/* Verification Results */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-600" />
          System Verification
        </h3>

        <div className="space-y-3 mb-4">
          {verificationSteps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-4 p-3 rounded-lg border">
              {step.status === 'pending' && (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              {step.status === 'checking' && (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              )}
              {step.status === 'passed' && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              {step.status === 'failed' && (
                <XCircle className="h-5 w-5 text-red-600" />
              )}

              <div className="flex-1">
                <p className="font-medium">{step.name}</p>
                <p className="text-sm text-gray-600">{step.description}</p>
                
                {step.error && (
                  <p className="text-xs text-red-600 mt-1">Error: {step.error}</p>
                )}

                {step.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">View details</summary>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(step.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              <Badge 
                variant={
                  step.status === 'passed' ? 'default' : 
                  step.status === 'failed' ? 'destructive' : 
                  'secondary'
                }
              >
                {step.status}
              </Badge>
            </div>
          ))}
        </div>

        <Button onClick={runVerification} disabled={verifying} className="w-full">
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Verification...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Verification Tests
            </>
          )}
        </Button>
      </Card>

      {/* Next Steps */}
      {allPassed && (
        <Card className="p-6 bg-green-50 border-green-200">
          <h3 className="text-lg font-semibold mb-4 text-green-900">🎉 Next Steps</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Go to Analytics Unified Manager</p>
                <p className="text-green-700">Configure tracking settings for each module and event type</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Run Analytics Test Suite</p>
                <p className="text-green-700">Test all 12 analytics functions to ensure everything works</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Check Analytics Center</p>
                <p className="text-green-700">View real-time analytics dashboard and insights</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
