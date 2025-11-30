import React, { useState } from 'react';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { AlertCircle, RefreshCw, Copy, Check, ExternalLink } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

type SetupGuideProps = {
  onClose: () => void;
};

const SQL_SETUP = `-- Create media table
CREATE TABLE IF NOT EXISTS media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  uploader TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  storage_path TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  duration_seconds INTEGER,
  downloadable BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0
);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  downloaded BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, media_id)
);

-- Create increment_views function
CREATE OR REPLACE FUNCTION increment_views(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media
  SET views = views + 1
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON media;
DROP POLICY IF EXISTS "Users can read own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON user_favorites;

-- Create policies
CREATE POLICY "Public read access" ON media FOR SELECT USING (true);
CREATE POLICY "Users can read own favorites" ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON user_favorites FOR DELETE USING (auth.uid() = user_id);`;

export function SetupGuide({ onClose }: SetupGuideProps) {
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySQL = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(SQL_SETUP);
      } else {
        // Fallback: create a temporary textarea
        const textArea = document.createElement("textarea");
        textArea.value = SQL_SETUP;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success('✅ SQL copied! Now paste it in Supabase SQL Editor.');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { error: mediaError } = await supabase
        .from('media')
        .select('id')
        .limit(1);

      const { error: favError } = await supabase
        .from('user_favorites')
        .select('media_id')
        .limit(1);

      if (mediaError?.code === 'PGRST205' || favError?.code === 'PGRST205') {
        toast.error('❌ Tables not found. Please run the SQL commands first.');
      } else if (mediaError || favError) {
        toast.error('Error connecting. Check console for details.');
        console.error('Connection test errors:', { mediaError, favError });
      } else {
        toast.success('✅ SUCCESS! Database is ready. Reload the page to use the app.');
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast.error('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="max-w-3xl w-full my-8 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-orange-600">⚠️ Database Setup Required</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none -mt-2"
          >
            ×
          </button>
        </div>

        {/* Alert */}
        <Alert className="mb-6 bg-red-50 border-red-300 border-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-gray-800">
            <strong>The app won't work until you complete this setup.</strong><br/>
            You need to create database tables in Supabase. This is a one-time setup (2 minutes).
          </AlertDescription>
        </Alert>

        {/* Simple 3-Step Guide */}
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-orange-200">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center">1</span>
              <h3 className="text-gray-900">Copy the SQL Commands</h3>
            </div>
            <div className="ml-11">
              <Button 
                onClick={copySQL}
                className="gap-2 bg-orange-500 hover:bg-orange-600 mb-3"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy SQL to Clipboard
                  </>
                )}
              </Button>
              <details className="mt-2">
                <summary className="text-sm text-blue-600 cursor-pointer hover:underline mb-2">
                  Show SQL Code (optional)
                </summary>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto max-h-64">
                  {SQL_SETUP}
                </pre>
              </details>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-orange-200">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center">2</span>
              <h3 className="text-gray-900">Run SQL in Supabase</h3>
            </div>
            <div className="ml-11">
              <ol className="text-sm text-gray-700 space-y-2 mb-3 list-decimal list-inside">
                <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase Dashboard</a></li>
                <li>Click <strong>"SQL Editor"</strong> in the left sidebar</li>
                <li>Click <strong>"New Query"</strong></li>
                <li><strong>Paste the SQL</strong> you copied in Step 1</li>
                <li>Click <strong>"Run"</strong> (or press Ctrl+Enter)</li>
                <li>Wait for "Success. No rows returned" message</li>
              </ol>
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Open Supabase Dashboard
              </a>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-orange-200">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center">3</span>
              <h3 className="text-gray-900">Verify Setup</h3>
            </div>
            <div className="ml-11">
              <p className="text-sm text-gray-700 mb-3">
                After running the SQL, click the button below to test the connection:
              </p>
              <Button 
                onClick={testConnection} 
                disabled={testing}
                variant="outline"
                className="gap-2 border-2 border-green-500 text-green-700 hover:bg-green-50"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Test Database Connection
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="mt-6 p-4 bg-green-50 border border-green-300 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>✅ After successful setup:</strong> Close this guide and <strong>reload the page (F5)</strong> to use the app!
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
          <Button 
            onClick={onClose} 
            variant="outline"
          >
            Close
          </Button>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-green-600 hover:bg-green-700"
          >
            Reload Page
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Need help? Check <strong>QUICK_START_GUIDE.md</strong> or <strong>ERROR_FIXES.md</strong> in the project files
        </p>
      </Card>
    </div>
  );
}
