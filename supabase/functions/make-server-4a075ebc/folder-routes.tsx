/**
 * Folder Management Routes for Banner, Media, and Sparkle
 * Handles CRUD operations for folder organization
 */

import { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

// ====================================================================
// BANNER FOLDERS
// ====================================================================

export async function getBannerFolders(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("banner_folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Banner Folders] Get error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function createBannerFolder(c: Context) {
  try {
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({ success: false, error: "Folder name is required" }, 400);
    }

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("banner_folders")
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Banner Folders] Create error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function updateBannerFolder(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description } = body;

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("banner_folders")
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Banner Folders] Update error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function deleteBannerFolder(c: Context) {
  try {
    const id = c.req.param("id");

    const supabase = supabaseClient();
    const { error } = await supabase
      .from("banner_folders")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Banner Folders] Delete error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

// ====================================================================
// MEDIA FOLDERS
// ====================================================================

export async function getMediaFolders(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("media_folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Media Folders] Get error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function createMediaFolder(c: Context) {
  try {
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({ success: false, error: "Folder name is required" }, 400);
    }

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("media_folders")
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Media Folders] Create error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function updateMediaFolder(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description } = body;

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("media_folders")
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Media Folders] Update error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function deleteMediaFolder(c: Context) {
  try {
    const id = c.req.param("id");

    const supabase = supabaseClient();
    const { error } = await supabase
      .from("media_folders")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Media Folders] Delete error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

// ====================================================================
// SPARKLE FOLDERS
// ====================================================================

export async function getSparkleFolders(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("sparkle_folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Sparkle Folders] Get error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function createSparkleFolder(c: Context) {
  try {
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({ success: false, error: "Folder name is required" }, 400);
    }

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("sparkle_folders")
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Sparkle Folders] Create error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function updateSparkleFolder(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description } = body;

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("sparkle_folders")
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Sparkle Folders] Update error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function deleteSparkleFolder(c: Context) {
  try {
    const id = c.req.param("id");

    const supabase = supabaseClient();
    const { error } = await supabase
      .from("sparkle_folders")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Sparkle Folders] Delete error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}
