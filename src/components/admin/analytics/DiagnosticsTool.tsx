import React, { useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Loader2, Play } from 'lucide-react';
import { supabase } from '../../../utils/supabase/client';

interface PipelineStage {
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    message?: string;
    details?: any;
}

interface DiagnosticsResult {
    stages: PipelineStage[];
    overallStatus: 'success' | 'error' | 'partial';
    timestamp: Date;
}

export function DiagnosticsTool() {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<DiagnosticsResult | null>(null);

    const baseUrl = 'https://lnherrwzjtemrvzahppg.supabase.co/functions/v1/make-server-4a075ebc';

    const runDiagnostics = async () => {
        setIsRunning(true);
        setResult(null);

        const stages: PipelineStage[] = [
            { name: 'Frontend Tracking', status: 'pending' },
            { name: 'API Endpoint', status: 'pending' },
            { name: 'Database RPC', status: 'pending' },
            { name: 'Data Persistence', status: 'pending' },
        ];

        setResult({
            stages: [...stages],
            overallStatus: 'partial',
            timestamp: new Date(),
        });

        try {
            // Get auth token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('You must be logged in to run diagnostics');
            }

            const authHeaders = {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            };

            // Stage 1: Test Frontend Tracking
            stages[0].status = 'running';
            setResult({ stages: [...stages], overallStatus: 'partial', timestamp: new Date() });

            await new Promise(resolve => setTimeout(resolve, 500));
            stages[0].status = 'success';
            stages[0].message = 'Frontend tracking code is present';
            setResult({ stages: [...stages], overallStatus: 'partial', timestamp: new Date() });

            // Stage 2: Test API Endpoint
            stages[1].status = 'running';
            setResult({ stages: [...stages], overallStatus: 'partial', timestamp: new Date() });

            const testPayload = {
                module_name: 'test',
                item_id: '00000000-0000-0000-0000-000000000000',
                event_type: 'diagnostic_test',
                ip_address: '127.0.0.1',
                user_agent: navigator.userAgent,
                device_type: 'web',
            };

            const apiResponse = await fetch(`${baseUrl}/api/analytics/track`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(testPayload),
            });

            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                stages[1].status = 'error';
                stages[1].message = `API returned ${apiResponse.status}: ${apiResponse.statusText}`;
                stages[1].details = errorText;
                setResult({ stages: [...stages], overallStatus: 'error', timestamp: new Date() });
                setIsRunning(false);
                return;
            }

            const apiResult = await apiResponse.json();
            stages[1].status = 'success';
            stages[1].message = 'API endpoint responded successfully';
            stages[1].details = apiResult;
            setResult({ stages: [...stages], overallStatus: 'partial', timestamp: new Date() });

            // Stage 3: Check if RPC was called
            stages[2].status = 'running';
            setResult({ stages: [...stages], overallStatus: 'partial', timestamp: new Date() });

            await new Promise(resolve => setTimeout(resolve, 500));

            if (apiResult.success) {
                stages[2].status = 'success';
                stages[2].message = 'Database RPC executed';
                stages[2].details = apiResult;
            } else {
                stages[2].status = 'error';
                stages[2].message = 'RPC execution failed';
                stages[2].details = apiResult.error || apiResult;
            }
            setResult({ stages: [...stages], overallStatus: 'partial', timestamp: new Date() });

            // Stage 4: Verify data persistence
            stages[3].status = 'running';
            setResult({ stages: [...stages], overallStatus: 'partial', timestamp: new Date() });

            await new Promise(resolve => setTimeout(resolve, 500));

            // Query to check if the test event was saved
            const checkResponse = await fetch(
                `${baseUrl}/api/admin/analytics/verify-event?` + new URLSearchParams({
                    module: 'test',
                    item_id: '00000000-0000-0000-0000-000000000000',
                    event_type: 'diagnostic_test',
                }),
                {
                    headers: authHeaders,
                }
            );

            if (checkResponse.ok) {
                const checkResult = await checkResponse.json();
                if (checkResult.exists) {
                    stages[3].status = 'success';
                    stages[3].message = 'Test event found in database';
                    stages[3].details = checkResult;
                } else {
                    stages[3].status = 'error';
                    stages[3].message = 'Test event NOT found in database (THIS IS THE PROBLEM)';
                    stages[3].details = checkResult;
                }
            } else {
                stages[3].status = 'error';
                stages[3].message = 'Could not verify database persistence';
            }

            const overallStatus = stages.every(s => s.status === 'success')
                ? 'success'
                : stages.some(s => s.status === 'error')
                    ? 'error'
                    : 'partial';

            setResult({ stages: [...stages], overallStatus, timestamp: new Date() });
        } catch (error) {
            console.error('Diagnostics error:', error);
            stages.forEach(s => {
                if (s.status === 'running' || s.status === 'pending') {
                    s.status = 'error';
                    s.message = 'Diagnostics interrupted';
                }
            });
            setResult({ stages: [...stages], overallStatus: 'error', timestamp: new Date() });
        } finally {
            setIsRunning(false);
        }
    };

    const getStatusIcon = (status: PipelineStage['status']) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'running':
                return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
            default:
                return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900">Pipeline Diagnostics</h3>
                <p className="mt-1 text-sm text-gray-600">
                    Test the complete analytics pipeline to identify issues
                </p>
            </div>

            {/* Run Diagnostics Button */}
            <div className="flex justify-center">
                <button
                    onClick={runDiagnostics}
                    disabled={isRunning}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0d5e38] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#0a4a2b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isRunning ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Running Diagnostics...
                        </>
                    ) : (
                        <>
                            <Play className="h-4 w-4" />
                            Run Diagnostics
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Overall Status */}
                    <div
                        className={`rounded-lg border-2 p-4 ${result.overallStatus === 'success'
                            ? 'border-green-200 bg-green-50'
                            : result.overallStatus === 'error'
                                ? 'border-red-200 bg-red-50'
                                : 'border-yellow-200 bg-yellow-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {result.overallStatus === 'success' ? (
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : result.overallStatus === 'error' ? (
                                <AlertCircle className="h-6 w-6 text-red-600" />
                            ) : (
                                <Activity className="h-6 w-6 text-yellow-600" />
                            )}
                            <div>
                                <p className="font-semibold">
                                    {result.overallStatus === 'success'
                                        ? '✅ All Systems Operational'
                                        : result.overallStatus === 'error'
                                            ? '❌ Issues Detected'
                                            : '⚠️ Partial Success'}
                                </p>
                                <p className="text-sm opacity-75">
                                    Test completed at {result.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Pipeline Stages */}
                    <div className="space-y-3">
                        {result.stages.map((stage, index) => (
                            <div
                                key={stage.name}
                                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">{getStatusIcon(stage.status)}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-gray-900">
                                                Stage {index + 1}: {stage.name}
                                            </h4>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${stage.status === 'success'
                                                    ? 'bg-green-100 text-green-700'
                                                    : stage.status === 'error'
                                                        ? 'bg-red-100 text-red-700'
                                                        : stage.status === 'running'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                {stage.status}
                                            </span>
                                        </div>
                                        {stage.message && (
                                            <p className="mt-1 text-sm text-gray-600">{stage.message}</p>
                                        )}
                                        {stage.details && (
                                            <details className="mt-2">
                                                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                                                    View details
                                                </summary>
                                                <pre className="mt-2 overflow-auto rounded bg-gray-50 p-2 text-xs">
                                                    {JSON.stringify(stage.details, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Recommended Actions */}
                    {result.overallStatus === 'error' && (
                        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                            <h4 className="font-semibold text-orange-900">Recommended Actions</h4>
                            <ul className="mt-2 space-y-1 text-sm text-orange-800">
                                {result.stages[1].status === 'error' && (
                                    <li>• Check if the API endpoint exists and is configured correctly</li>
                                )}
                                {result.stages[2].status === 'error' && (
                                    <li>• Verify the RPC function exists in the database</li>
                                )}
                                {result.stages[3].status === 'error' && (
                                    <li>
                                        • <strong>Critical:</strong> Events are being received but not saved to the
                                        database. Check the RPC function logic and database permissions/RLS policies.
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
