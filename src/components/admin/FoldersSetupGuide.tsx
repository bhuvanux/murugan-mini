import React, { useState } from "react";
import { AlertCircle, Copy, CheckCircle, Database, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FoldersSetupGuideProps {
  contentType?: "wallpapers" | "media" | "sparkle" | "banners";
}

export function FoldersSetupGuide({ contentType = "wallpapers" }: FoldersSetupGuideProps) {
  const [copied, setCopied] = useState(false);

  const isMedia = contentType === "media";
  const isSparkle = contentType === "sparkle";
  const isBanner = contentType === "banners";

  const mainTable = isSparkle ? "sparkle" : (isMedia ? "media" : (isBanner ? "banners" : "wallpapers"));
  const folderTable = isSparkle ? "sparkle_folders" : (isMedia ? "media_folders" : (isBanner ? "banner_folders" : "wallpaper_folders"));
  const analyticsTable = isSparkle ? "sparkle_analytics" : (isMedia ? "media_analytics" : (isBanner ? "banner_analytics" : "wallpaper_analytics"));
  const idColumn = isSparkle ? "sparkle_id" : (isMedia ? "media_id" : (isBanner ? "banner_id" : "wallpaper_id"));
  const functionPrefix = isSparkle ? "increment_sparkle" : (isMedia ? "increment_media" : (isBanner ? "increment_banner" : "increment_wallpaper"));

  const sqlScript = `-- Quick Setup: Run this SQL in Supabase
-- Copy ALL of this and paste in Supabase SQL Editor → Click RUN

-- 1. Create ${folderTable} table
CREATE TABLE IF NOT EXISTS ${folderTable} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create ${analyticsTable} table
CREATE TABLE IF NOT EXISTS ${analyticsTable} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ${idColumn} UUID NOT NULL REFERENCES ${mainTable}(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'download', 'like', 'share')),
  user_id UUID,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add folder_id to ${mainTable} table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '${mainTable}' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE ${mainTable} ADD COLUMN folder_id UUID REFERENCES ${folderTable}(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Add counter columns to ${mainTable} if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${mainTable}' AND column_name = 'view_count') THEN
    ALTER TABLE ${mainTable} ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${mainTable}' AND column_name = 'download_count') THEN
    ALTER TABLE ${mainTable} ADD COLUMN download_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${mainTable}' AND column_name = 'like_count') THEN
    ALTER TABLE ${mainTable} ADD COLUMN like_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${mainTable}' AND column_name = 'share_count') THEN
    ALTER TABLE ${mainTable} ADD COLUMN share_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- 5. Create increment functions
DROP FUNCTION IF EXISTS ${functionPrefix}_views(uuid);
CREATE OR REPLACE FUNCTION ${functionPrefix}_views(target_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ${mainTable} SET view_count = view_count + 1 WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS ${functionPrefix}_downloads(uuid);
CREATE OR REPLACE FUNCTION ${functionPrefix}_downloads(target_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ${mainTable} SET download_count = download_count + 1 WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS ${functionPrefix}_likes(uuid);
CREATE OR REPLACE FUNCTION ${functionPrefix}_likes(target_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ${mainTable} SET like_count = like_count + 1 WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS ${functionPrefix}_shares(uuid);
CREATE OR REPLACE FUNCTION ${functionPrefix}_shares(target_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ${mainTable} SET share_count = share_count + 1 WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_${folderTable}_created_at ON ${folderTable}(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_${mainTable}_folder_id ON ${mainTable}(folder_id);
CREATE INDEX IF NOT EXISTS idx_${analyticsTable}_target_id ON ${analyticsTable}(${idColumn});
CREATE INDEX IF NOT EXISTS idx_${analyticsTable}_event_type ON ${analyticsTable}(event_type);
CREATE INDEX IF NOT EXISTS idx_${analyticsTable}_created_at ON ${analyticsTable}(created_at DESC);

-- 7. Create trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_${folderTable}_updated_at ON ${folderTable};
CREATE TRIGGER update_${folderTable}_updated_at
  BEFORE UPDATE ON ${folderTable}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant permissions
GRANT ALL ON ${folderTable} TO service_role;
GRANT ALL ON ${analyticsTable} TO service_role;
GRANT EXECUTE ON FUNCTION ${functionPrefix}_views TO service_role;
GRANT EXECUTE ON FUNCTION ${functionPrefix}_downloads TO service_role;
GRANT EXECUTE ON FUNCTION ${functionPrefix}_likes TO service_role;
GRANT EXECUTE ON FUNCTION ${functionPrefix}_shares TO service_role;

-- 9. Add compression stats columns if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${mainTable}' AND column_name = 'original_size_bytes') THEN
    ALTER TABLE ${mainTable} ADD COLUMN original_size_bytes BIGINT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${mainTable}' AND column_name = 'optimized_size_bytes') THEN
    ALTER TABLE ${mainTable} ADD COLUMN optimized_size_bytes BIGINT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${mainTable}' AND column_name = 'metadata') THEN
    ALTER TABLE ${mainTable} ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;`;

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
