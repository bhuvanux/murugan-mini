import React, { useState } from 'react';
import { Send, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { TrackingModule, TrackingAction, TRACKING_MODULES } from '../../types/tracking';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function TrackingTestPanel() {
  const [selectedModule, setSelectedModule] = useState<TrackingModule>('wallpaper');
  const [selectedAction, setSelectedAction] = useState<TrackingAction>('view');
  const [contentId, setContentId] = useState('');
  const [userId, setUserId] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const selectedModuleConfig = TRACKING_MODULES.find(m => m.id === selectedModule);

  const sendTestEvent = async () => {
    try {
      setTesting(true);
      setResult(null);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/tracking/track`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            module: selectedModule,
            action: selectedAction,
            content_id: contentId || undefined,
            user_id: userId || undefined,
            session_id: `test-session-${Date.now()}`,
            metadata: {
              test: true,
              timestamp: new Date().toISOString(),
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send event');
      }

      const data = await response.json();
      setResult({
        success: true,
        message: `Event tracked successfully! ID: ${data.event_id}`
      });
    } catch (error) {
      console.error('Error sending test event:', error);
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setTesting(false);
    }
  };

  const resetModule = async (module: TrackingModule) => {
    if (!confirm(`Are you sure you want to reset all data for ${module}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/tracking/reset/${module}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reset module');
      }

      alert(`Module ${module} has been reset successfully`);
      window.location.reload();
    } catch (error) {
      console.error('Error resetting module:', error);
      alert('Failed to reset module');
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-2">Tracking Test Panel</h2>
          <p className="text-sm text-gray-500">Send test events to verify tracking</p>
        </div>

        {/* Module Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Module</label>
          <Select value={selectedModule} onValueChange={(v) => {
            setSelectedModule(v as TrackingModule);
            // Reset action when module changes
            const module = TRACKING_MODULES.find(m => m.id === v);
            if (module && module.actions.length > 0) {
              setSelectedAction(module.actions[0]);
            }
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRACKING_MODULES.map(module => (
                <SelectItem key={module.id} value={module.id}>
                  {module.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Action</label>
          <Select value={selectedAction} onValueChange={(v) => setSelectedAction(v as TrackingAction)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectedModuleConfig?.actions.map(action => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Optional Fields */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Content ID (optional)</label>
          <Input
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            placeholder="e.g., wallpaper-123"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">User ID (optional)</label>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g., user-456"
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={sendTestEvent}
          disabled={testing}
          className="w-full gap-2"
        >
          {testing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Test Event
            </>
          )}
        </Button>

        {/* Result */}
        {result && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-3">Quick Actions</p>
          <div className="space-y-2">
            <Button
              onClick={() => resetModule(selectedModule)}
              variant="outline"
              size="sm"
              className="w-full text-red-600 hover:text-red-700"
            >
              Reset {selectedModuleConfig?.name} Data
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
