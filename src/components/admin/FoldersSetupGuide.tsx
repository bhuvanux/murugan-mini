import React, { useState } from "react";
import { AlertCircle, Copy, CheckCircle, Database, ExternalLink } from "lucide-react";
import { toast } from "sonner@2.0.3";

export function FoldersSetupGuide() {
  const [copied, setCopied] = useState(false);

  const sqlScript = `-- Quick Setup: Run this SQL in Supabase
-- Copy ALL of this and paste in Supabase SQL Editor → Click RUN

-- 1. Create wallpaper_folders table
CREATE TABLE IF NOT EXISTS wallpaper_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create wallpaper_analytics table
CREATE TABLE IF NOT EXISTS wallpaper_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'download', 'like', 'share')),
  user_id UUID,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add folder_id to wallpapers table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallpapers' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE wallpapers ADD COLUMN folder_id UUID REFERENCES wallpaper_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Add counter columns to wallpapers if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'view_count') THEN
    ALTER TABLE wallpapers ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'download_count') THEN
    ALTER TABLE wallpapers ADD COLUMN download_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'like_count') THEN
    ALTER TABLE wallpapers ADD COLUMN like_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'share_count') THEN
    ALTER TABLE wallpapers ADD COLUMN share_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- 5. Create increment functions
CREATE OR REPLACE FUNCTION increment_wallpaper_views(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET view_count = view_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_wallpaper_downloads(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET download_count = download_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_wallpaper_likes(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET like_count = like_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_wallpaper_shares(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET share_count = share_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_wallpaper_folders_created_at ON wallpaper_folders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_folder_id ON wallpapers(folder_id);
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_wallpaper_id ON wallpaper_analytics(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_event_type ON wallpaper_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_created_at ON wallpaper_analytics(created_at DESC);

-- 7. Create trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_wallpaper_folders_updated_at ON wallpaper_folders;
CREATE TRIGGER update_wallpaper_folders_updated_at
  BEFORE UPDATE ON wallpaper_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant permissions
GRANT ALL ON wallpaper_folders TO service_role;
GRANT ALL ON wallpaper_analytics TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_views TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_downloads TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_likes TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_shares TO service_role;`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript);
      setCopied(true);
      toast.success("SQL copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error("Failed to copy. Please select and copy manually.");
    }
  };

  return (
    <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-orange-100 rounded-xl">
          <Database className="w-6 h-6 text-orange-600" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h3 className="text-inter-bold-18 text-orange-900">
              Database Tables Required
            </h3>
          </div>
          
          <p className="text-orange-800 mb-2 text-inter-regular-14">
            The folder management and analytics features require additional database tables.
          </p>
          <p className="text-orange-700 mb-4 text-sm font-medium">
            ⏱️ <strong>Setup time:</strong> 2 minutes | <strong>Difficulty:</strong> Easy | <strong>One-time only</strong>
          </p>

          <div className="space-y-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <p className="font-semibold text-gray-800 text-inter-semibold-16">
                  Copy the SQL Script
                </p>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Click the "Copy SQL" button below to copy the setup script
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <p className="font-semibold text-gray-800 text-inter-semibold-16">
                  Open Supabase SQL Editor
                </p>
              </div>
              <p className="text-sm text-gray-600 ml-8 mb-2">
                Go to your Supabase Dashboard → SQL Editor
              </p>
              <a
                href="https://supabase.com/dashboard/project/_/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-8 inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 underline"
              >
                Open Supabase Dashboard
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <p className="font-semibold text-gray-800 text-inter-semibold-16">
                  Paste and Run
                </p>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Paste the SQL script in the editor and click "RUN" button
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
                <p className="font-semibold text-gray-800 text-inter-semibold-16">
                  Refresh This Page
                </p>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                After running the SQL, refresh this page to see the folder system
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-inter-medium-16"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy SQL Script
                </>
              )}
            </button>

            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-medium text-inter-medium-16"
            >
              Refresh Page After Setup
            </button>
          </div>

          <div className="mt-4 p-3 bg-orange-100 rounded-lg">
            <p className="text-xs text-orange-700">
              💡 <strong>Tip:</strong> The SQL script is safe to run multiple times. It will only create tables if they don't exist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
