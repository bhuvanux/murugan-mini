/**
 * Database Initialization
 * Creates all required tables if they don't exist
 */

import { createClient } from "npm:@supabase/supabase-js@2";

export async function initializeDatabase() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  console.log("[DB Init] Starting database initialization...");

  try {
    // Check if tables exist by trying to query them
    const { error: bannersError } = await supabase.from("banners").select("id").limit(1);
    
    if (bannersError) {
      console.log("[DB Init] Tables don't exist yet. They need to be created in Supabase Dashboard.");
      console.log("[DB Init] Please run the migration file: /supabase/migrations/001_initial_schema.sql");
      console.log("[DB Init] Go to: https://supabase.com/dashboard/project/[your-project]/sql");
      
      return {
        success: false,
        message: "Database tables not found. Please run the SQL migration first.",
        instructions: [
          "1. Go to your Supabase Dashboard",
          "2. Navigate to SQL Editor",
          "3. Copy the contents of /supabase/migrations/001_initial_schema.sql",
          "4. Paste and execute the SQL",
          "5. Refresh this page"
        ]
      };
    }

    console.log("[DB Init] ✓ Database tables exist");
    
    // Verify all critical tables
    const tables = ["banners", "wallpapers", "media", "photos", "sparkle", "categories"];
    const results = [];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select("id").limit(1);
      if (error) {
        results.push({ table, status: "missing", error: error.message });
      } else {
        results.push({ table, status: "ok" });
      }
    }

    const missingTables = results.filter(r => r.status === "missing");
    
    if (missingTables.length > 0) {
      return {
        success: false,
        message: "Some tables are missing",
        tables: results
      };
    }

    return {
      success: true,
      message: "All database tables are ready",
      tables: results
    };
    
  } catch (error: any) {
    console.error("[DB Init] Error:", error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
}

/**
 * Get database status
 */
export async function getDatabaseStatus() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const tables = [
    "categories",
    "banners",
    "wallpapers",
    "media",
    "photos",
    "sparkle",
    "users_app",
    "ai_chats",
    "ai_chat_messages",
    "downloads_log",
    "likes_log",
    "admin_activity_log"
  ];

  const status: any = {};

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        status[table] = { exists: false, error: error.message };
      } else {
        status[table] = { exists: true, count: count || 0 };
      }
    } catch (error: any) {
      status[table] = { exists: false, error: error.message };
    }
  }

  return status;
}
