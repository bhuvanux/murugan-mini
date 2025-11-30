/**
 * 🔍 Database Diagnostics Component
 * Run comprehensive checks on database schema and banner uploads
 */

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Play, Database, Upload } from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";

export default function DatabaseDiagnostics() {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/diagnostics/database`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setResults(data);
    } catch (error: any) {
      setResults({
        error: true,
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const runBannerTest = async () => {
    setTestLoading(true);
    setTestResults(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/diagnostics/test-banner`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setTestResults(data);
    } catch (error: any) {
      setTestResults({
        error: true,
        message: error.message,
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="mb-2">Database Diagnostics</h1>
        <p className="text-gray-600">
          Run comprehensive checks to identify database schema issues and test banner uploads
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={runDiagnostics}
          disabled={loading}
          size="lg"
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Database className="w-5 h-5" />
          )}
          Run Full Diagnostics
        </Button>

        <Button
          onClick={runBannerTest}
          disabled={testLoading}
          size="lg"
          variant="outline"
          className="gap-2"
        >
          {testLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          Test Banner Upload
        </Button>
      </div>

      {/* Banner Test Results */}
      {testResults && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Banner Upload Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResults.error ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Test Failed</AlertTitle>
                <AlertDescription>{testResults.message}</AlertDescription>
              </Alert>
            ) : testResults.status?.includes("PASSED") ? (
              <Alert className="border-green-600 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900">All Tests Passed!</AlertTitle>
                <AlertDescription className="text-green-800">
                  {testResults.message}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Test Failed: {testResults.step}</AlertTitle>
                <AlertDescription>
                  <div className="space-y-2 mt-2">
                    <p>{testResults.message || testResults.error?.message}</p>
                    {testResults.recommendation && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="font-semibold text-yellow-900">Recommendation:</p>
                        <p className="text-yellow-800">{testResults.recommendation}</p>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {testResults.testsPassed && (
              <div className="space-y-2">
                <h4 className="font-semibold">Tests Passed:</h4>
                <ul className="space-y-1">
                  {testResults.testsPassed.map((test: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      {test}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                View Raw Response
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Full Diagnostic Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.error ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : results.summary?.includes("PASSED") ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                )}
                Diagnostic Summary
              </CardTitle>
              <CardDescription>
                {results.timestamp && new Date(results.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.error ? (
                <Alert variant="destructive">
                  <AlertTitle>Diagnostics Failed</AlertTitle>
                  <AlertDescription>{results.message}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <Alert
                    className={
                      results.summary?.includes("PASSED")
                        ? "border-green-600 bg-green-50"
                        : results.errors?.length > 0
                        ? "border-red-600 bg-red-50"
                        : "border-yellow-600 bg-yellow-50"
                    }
                  >
                    <AlertDescription className="text-lg font-semibold">
                      {results.summary}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4">
                    <Badge variant="outline" className="gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      {results.checks?.length || 0} Checks
                    </Badge>
                    {results.errors?.length > 0 && (
                      <Badge variant="destructive" className="gap-2">
                        <XCircle className="w-4 h-4" />
                        {results.errors.length} Errors
                      </Badge>
                    )}
                    {results.warnings?.length > 0 && (
                      <Badge variant="outline" className="gap-2 border-yellow-600">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        {results.warnings.length} Warnings
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Errors */}
          {results.errors?.length > 0 && (
            <Card className="border-red-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  Errors ({results.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.errors.map((err: any, idx: number) => (
                  <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded space-y-2">
                    <h4 className="font-semibold text-red-900">{err.check}</h4>
                    <p className="text-red-800 text-sm">{err.error}</p>
                    {err.code && (
                      <Badge variant="outline" className="text-red-700">
                        Code: {err.code}
                      </Badge>
                    )}
                    {err.hint && (
                      <p className="text-xs text-red-600 mt-2">Hint: {err.hint}</p>
                    )}
                    {err.attemptedFields && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-red-700">Attempted Fields</summary>
                        <ul className="mt-1 ml-4 list-disc">
                          {err.attemptedFields.map((field: string, i: number) => (
                            <li key={i}>{field}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {results.warnings?.length > 0 && (
            <Card className="border-yellow-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="w-5 h-5" />
                  Warnings ({results.warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.warnings.map((warn: any, idx: number) => (
                  <div key={idx} className="p-4 bg-yellow-50 border border-yellow-200 rounded space-y-2">
                    <h4 className="font-semibold text-yellow-900">{warn.check}</h4>
                    {warn.message && <p className="text-yellow-800 text-sm">{warn.message}</p>}
                    {warn.missingColumn && (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-900">
                        Missing Column: {warn.missingColumn}
                      </Badge>
                    )}
                    {warn.recommendation && (
                      <div className="mt-2 p-2 bg-white rounded border border-yellow-300">
                        <p className="text-xs font-semibold text-yellow-900">Recommendation:</p>
                        <p className="text-xs text-yellow-800 mt-1">{warn.recommendation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Successful Checks */}
          {results.checks?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Successful Checks ({results.checks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.checks.map((check: any, idx: number) => (
                  <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <h4 className="font-semibold text-green-900">{check.check}</h4>
                    </div>
                    {check.status && <Badge variant="outline" className="text-green-700">{check.status}</Badge>}
                    {check.count !== undefined && (
                      <p className="text-sm text-green-800">Count: {check.count}</p>
                    )}
                    {check.workingFields && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-green-700">
                          Working Fields ({check.workingFields.length})
                        </summary>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {check.workingFields.map((field: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs bg-green-100">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </details>
                    )}
                    {check.failingFields?.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-red-700">
                          Failing Fields ({check.failingFields.length})
                        </summary>
                        <div className="mt-2 space-y-1">
                          {check.failingFields.map((field: any, i: number) => (
                            <div key={i} className="p-2 bg-red-50 rounded text-xs">
                              <span className="font-semibold">{field.field}:</span> {field.error}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Raw JSON */}
          <details>
            <summary className="cursor-pointer p-4 bg-gray-100 rounded hover:bg-gray-200 transition">
              View Full Raw JSON Response
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {!results && !testResults && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Click "Run Full Diagnostics" to check your database schema and configuration</p>
            <p className="text-sm mt-2">or "Test Banner Upload" to quickly test banner upload functionality</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
