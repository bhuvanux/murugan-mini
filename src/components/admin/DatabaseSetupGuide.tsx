import React, { useState, useEffect } from "react";
import { Database, CheckCircle, XCircle, Loader2, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export function DatabaseSetupGuide() {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showSQL, setShowSQL] = useState(true); // Changed to TRUE - show SQL by default

  const checkDatabaseStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/admin/db-status`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      console.log("[DB Setup] Status:", result);
      setDbStatus(result.status);
    } catch (error: any) {
      console.error("[DB Setup] Error:", error);
      toast.error("Failed to check database status");
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const copySQL = () => {
    const sql = document.getElementById("migration-sql")?.textContent || "";
    navigator.clipboard.writeText(sql);
    toast.success("SQL copied to clipboard!");
  };

  const openSupabaseDashboard = () => {
    window.open(`https://supabase.com/dashboard/project/${projectId}/sql`, "_blank");
  };

  // Check if all tables exist
  const allTablesExist = dbStatus && Object.values(dbStatus).every((table: any) => table.exists);

  if (isChecking) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-blue-800 font-medium">Checking database status...</p>
      </div>
    );
  }

  if (allTablesExist) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-green-900 font-semibold mb-2">✅ Database Ready!</h3>
            <p className="text-green-700 text-sm mb-3">
              All required tables are set up and ready to use. You can now upload content.
            </p>
            <button
              onClick={checkDatabaseStatus}
              className="text-sm text-green-700 font-medium hover:text-green-800 flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4" />
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4 mb-4">
        <AlertCircle className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-orange-900 font-bold mb-2">⚠️ Database Setup Required</h3>
          <p className="text-orange-800 text-sm mb-3">
            The database tables haven't been created yet. Follow these steps to set up your Supabase database:
          </p>
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-3">
            <p className="text-yellow-900 text-sm font-medium mb-1">📄 Quick Access:</p>
            <p className="text-yellow-800 text-xs">
              The complete SQL migration is also available in <code className="bg-yellow-200 px-1 py-0.5 rounded">/QUICK_SETUP.sql</code> file in your project root.
            </p>
          </div>
        </div>
      </div>

      {/* Setup Steps */}
      <div className="space-y-4 mb-4">
        <div className="bg-white rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h4 className="font-semibold text-gray-800">Open Supabase SQL Editor</h4>
          </div>
          <p className="text-sm text-gray-600 ml-11 mb-3">
            Click the button below to open the Supabase SQL Editor in a new tab.
          </p>
          <button
            onClick={openSupabaseDashboard}
            className="ml-11 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Open SQL Editor
          </button>
        </div>

        <div className="bg-white rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h4 className="font-semibold text-gray-800">Copy & Run Migration SQL</h4>
          </div>
          <p className="text-sm text-gray-600 ml-11 mb-3">
            Copy the SQL below and paste it into the SQL Editor, then click "Run".
          </p>
          <div className="ml-11">
            <button
              onClick={() => setShowSQL(!showSQL)}
              className="text-sm text-orange-700 font-medium hover:text-orange-800 mb-2"
            >
              {showSQL ? "Hide SQL" : "Show SQL Migration"}
            </button>
            {showSQL && (
              <div className="relative">
                <pre
                  id="migration-sql"
                  className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono"
                >
{`-- MURUGAN APP DATABASE SCHEMA
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallpapers table  
CREATE TABLE IF NOT EXISTS wallpapers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  is_video BOOLEAN DEFAULT FALSE,
  video_url TEXT,
  category_id UUID REFERENCES categories(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL,
  file_url TEXT,
  thumbnail_url TEXT,
  youtube_id TEXT,
  youtube_url TEXT,
  storage_path TEXT,
  artist TEXT,
  duration INTEGER,
  category_id UUID REFERENCES categories(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sparkle table
CREATE TABLE IF NOT EXISTS sparkle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  content_json JSONB,
  cover_image_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  author TEXT,
  category_id UUID REFERENCES categories(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  read_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, slug, type, icon, color) VALUES
  ('Festivals', 'festivals', 'banner', '🎉', '#FF6B6B'),
  ('Temples', 'temples', 'banner', '🛕', '#4ECDC4'),
  ('Lord Murugan', 'lord-murugan', 'wallpaper', '🙏', '#FFD93D'),
  ('Devotional Songs', 'devotional-songs', 'media', '🎵', '#F72585'),
  ('Temple Photos', 'temple-photos', 'photo', '📸', '#3A0CA3'),
  ('Festival News', 'festival-news', 'sparkle', '📰', '#4CC9F0')
ON CONFLICT (slug) DO NOTHING;

-- Success message
SELECT 'Database tables created successfully!' as message;`}
                </pre>
                <button
                  onClick={copySQL}
                  className="absolute top-2 right-2 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h4 className="font-semibold text-gray-800">Verify Setup</h4>
          </div>
          <p className="text-sm text-gray-600 ml-11 mb-3">
            After running the SQL, click "Check Status" to verify everything is set up correctly.
          </p>
          <button
            onClick={checkDatabaseStatus}
            disabled={isChecking}
            className="ml-11 flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Check Status
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table Status */}
      {dbStatus && (
        <div className="bg-white rounded-lg p-4 border border-orange-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Table Status
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(dbStatus).map(([table, status]: [string, any]) => (
              <div key={table} className="flex items-center gap-2 text-sm">
                {status.exists ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={status.exists ? "text-gray-700" : "text-red-700"}>
                  {table}
                </span>
                {status.exists && status.count !== undefined && (
                  <span className="text-gray-400 text-xs">({status.count} rows)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}