/**
 * Complete API Routes for Murugan Admin Panel
 * Full CRUD operations with image upload, optimization, and database integration
 */

import { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { uploadFile, getPublicUrl, deleteFile } from "./storage-init.tsx";
import * as kv from "./kv_store.tsx";

const supabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

function normalizeTempleSearchKey(input: string): string {
  const original = (input || "").trim();
  if (!original) return "";

  let normalized = original.normalize("NFC").toLowerCase();
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");
  normalized = normalized.replace(/[\s\-_,.()\[\]{}:;!?'"|/\\]+/g, " ");

  const variants: Array<[RegExp, string]> = [
    [/கந்தா/gu, "கந்தன்"],
    [/கந்த/gu, "கந்தன்"],
    [/முருகா/gu, "முருகன்"],
    [/முருக/gu, "முருகன்"],
    [/சுப்பிரமணிய/gu, "முருகன்"],
    [/சுப்ரமணிய/gu, "முருகன்"],
    [/சுப்பிரமண்ய/gu, "முருகன்"],
  ];

  for (const [re, replacement] of variants) {
    normalized = normalized.replace(re, replacement);
  }

  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

// ====================================================================
// DASHBOARD FEATURE ICONS (Admin)
// ====================================================================

export async function uploadDashboardIcon(c: Context) {
  try {
    const formData = await c.req.formData();
    const fileRaw = formData.get("file");
    const file =
      fileRaw instanceof File
        ? fileRaw
        : fileRaw instanceof Blob
          ? new File([fileRaw], "upload", { type: fileRaw.type })
          : null;

    if (!file) {
      return c.json({ error: "file is required" }, 400);
    }

    const filename = generateFilename(file.name, "icons");
    const uploadResult = await uploadFile("dashboard-icons", filename, file, {
      contentType: file.type,
      cacheControl: "31536000",
    });

    if (!uploadResult.success) {
      return c.json({ error: uploadResult.error }, 500);
    }

    const url = getPublicUrl("dashboard-icons", filename);
    return c.json({ success: true, url, path: filename });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function listDashboardIcons(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase.storage
      .from("dashboard-icons")
      .list("icons", { limit: 200, sortBy: { column: "name", order: "asc" } });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    const files = (data || [])
      .filter((f: any) => f && f.name)
      .map((f: any) => {
        const path = `icons/${f.name}`;
        return {
          name: f.name,
          path,
          url: getPublicUrl("dashboard-icons", path),
        };
      });

    return c.json({ success: true, data: files });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

function buildTempleSearchKey(params: {
  temple_name_ta: string;
  temple_name_en?: string | null;
  place: string;
}): string {
  const combined = [params.temple_name_ta || "", params.temple_name_en || "", params.place || ""]
    .join(" ")
    .trim();
  return normalizeTempleSearchKey(combined);
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string, prefix: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const ext = originalName.split(".").pop();
  return `${prefix}/${timestamp}-${random}.${ext}`;
}

function toISODateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Log admin activity
 */
async function logAdminActivity(
  action: string,
  resourceType: string,
  resourceId: string,
  details: any,
  c: Context
) {
  const supabase = supabaseClient();
  await supabase.from("admin_activity_log").insert({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    ip_address: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for"),
    user_agent: c.req.header("user-agent"),
  });
}

// ====================================================================
// DAILY QUOTES (QUOTES / WISHES) ROUTES
// ====================================================================

export async function uploadQuote(c: Context) {
  try {
    const formData = await c.req.formData();
    const fileRaw = formData.get("file");
    const file =
      fileRaw instanceof File
        ? fileRaw
        : fileRaw instanceof Blob
          ? new File([fileRaw], "upload", { type: fileRaw.type })
          : null;
    const text = (formData.get("text") as string) || (formData.get("title") as string) || "";
    const publishStatus = (formData.get("publishStatus") as string) || "draft";
    const scheduledForRaw =
      (formData.get("scheduled_for") as string) ||
      (formData.get("scheduled_at") as string) ||
      "";
    const autoDeleteRaw = (formData.get("auto_delete") as string) || "true";

    if (!file) {
      return c.json({ error: "file is required" }, 400);
    }

    const scheduledFor = scheduledForRaw
      ? toISODateLocal(new Date(scheduledForRaw))
      : toISODateLocal(new Date());
    const autoDelete = autoDeleteRaw === "false" ? false : true;

    const resolvedText = text.trim() ? text.trim() : " ";

    let storagePath: string | null = null;
    let backgroundUrl: string | null = null;

    if (file) {
      const filename = generateFilename(file.name, "quotes");
      const uploadResult = await uploadFile("quotes", filename, file, {
        contentType: file.type,
      });

      if (!uploadResult.success) {
        return c.json({ error: uploadResult.error }, 500);
      }

      storagePath = filename;
      backgroundUrl = getPublicUrl("quotes", filename);
    }

    const supabase = supabaseClient();

    // Replace existing banner for the same day (prevents multiple banners fighting for the same date)
    const { data: existing } = await supabase
      .from("daily_quotes")
      .select("id, storage_path")
      .eq("scheduled_for", scheduledFor)
      .in("publish_status", ["published", "scheduled"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPublishedAt = publishStatus === "published" ? new Date().toISOString() : null;

    let data: any = null;
    let error: any = null;

    if (existing?.id) {
      const { data: updated, error: updateError } = await supabase
        .from("daily_quotes")
        .update({
          text: resolvedText,
          publish_status: publishStatus,
          scheduled_for: scheduledFor,
          published_at: nextPublishedAt,
          auto_delete: autoDelete,
          background_url: backgroundUrl,
          storage_path: storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      data = updated;
      error = updateError;

      if (!updateError && existing.storage_path && storagePath && existing.storage_path !== storagePath) {
        await deleteFile("quotes", existing.storage_path);
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("daily_quotes")
        .insert({
          text: resolvedText,
          publish_status: publishStatus,
          scheduled_for: scheduledFor,
          published_at: nextPublishedAt,
          auto_delete: autoDelete,
          background_url: backgroundUrl,
          storage_path: storagePath,
        })
        .select()
        .single();

      data = inserted;
      error = insertError;
    }

    if (error) {
      console.error("[Quote Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("upload", "quote", data.id, { scheduled_for: scheduledFor }, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Quote Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function getQuotes(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("daily_quotes")
      .select("*")
      .order("scheduled_for", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function getTodayQuote(c: Context) {
  try {
    const dateParam = c.req.query("date");
    const requestedDate = dateParam ? String(dateParam).slice(0, 10) : toISODateLocal(new Date());
    const supabase = supabaseClient();

    const { data: published, error: publishedError } = await supabase
      .from("daily_quotes")
      .select("id, text, background_url, scheduled_for")
      .eq("scheduled_for", requestedDate)
      .in("publish_status", ["published", "scheduled"])
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (publishedError) {
      return c.json({ success: true, data: null });
    }

    if (published) {
      return c.json({ success: true, data: published });
    }

    return c.json({ success: true, data: null });
  } catch (error: any) {
    return c.json({ success: true, data: null });
  }
}

export async function updateQuote(c: Context) {
  try {
    const id = c.req.param("id");
    const contentType = c.req.header("content-type") || "";

    const supabase = supabaseClient();
    const { data: existing } = await supabase
      .from("daily_quotes")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    // Multipart update supports updating the background file
    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      const file = (formData.get("file") as File) || null;

      const text = (formData.get("text") as string) || "";
      const publishStatus = (formData.get("publish_status") as string) || (formData.get("publishStatus") as string) || undefined;
      const scheduledForRaw = (formData.get("scheduled_for") as string) || undefined;
      const autoDeleteRaw = (formData.get("auto_delete") as string) || undefined;

      const updateData: any = {};
      if (text != null) updateData.text = text.trim() ? text.trim() : " ";
      if (publishStatus) updateData.publish_status = publishStatus;
      if (scheduledForRaw) updateData.scheduled_for = String(scheduledForRaw).slice(0, 10);
      if (autoDeleteRaw != null) updateData.auto_delete = autoDeleteRaw !== "false";

      if (file) {
        const filename = generateFilename(file.name, "quotes");
        const uploadResult = await uploadFile("quotes", filename, file, {
          contentType: file.type,
        });
        if (!uploadResult.success) {
          return c.json({ error: uploadResult.error }, 500);
        }

        updateData.storage_path = filename;
        updateData.background_url = getPublicUrl("quotes", filename);

        if (existing?.storage_path) {
          await deleteFile("quotes", existing.storage_path);
        }
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("daily_quotes")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) return c.json({ error: error.message }, 500);
      await logAdminActivity("update", "quote", id, updateData, c);
      return c.json({ success: true, data });
    }

    // JSON update
    const body = await c.req.json();
    const updateData: any = { ...body, updated_at: new Date().toISOString() };
    if (updateData.text != null) {
      updateData.text = String(updateData.text).trim() ? String(updateData.text).trim() : " ";
    }
    if (updateData.scheduled_for != null) {
      updateData.scheduled_for = String(updateData.scheduled_for).slice(0, 10);
    }

    const { data, error } = await supabase
      .from("daily_quotes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    await logAdminActivity("update", "quote", id, body, c);
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteQuote(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { data: quote } = await supabase
      .from("daily_quotes")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (quote?.storage_path) {
      await deleteFile("quotes", quote.storage_path);
    }

    const { error } = await supabase.from("daily_quotes").delete().eq("id", id);
    if (error) return c.json({ error: error.message }, 500);

    await logAdminActivity("delete", "quote", id, {}, c);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// BANNER ROUTES - All category_id references removed
// ====================================================================

export async function uploadBanner(c: Context) {
  try {
    console.log("[Banner Upload] Starting upload process...");
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string;
    const folderId = formData.get("folder_id") as string;
    const publishStatus = formData.get("publishStatus") as string || "draft";
    const scheduledAt = formData.get("scheduled_at") as string;
    const bannerType = formData.get("bannerType") as string || "home";
    const targetUrl = formData.get("target_url") as string;

    console.log("[Banner Upload] Form data:", { title, publishStatus, bannerType, folderId, scheduledAt });

    if (!file || !title) {
      return c.json({ error: "File and title are required" }, 400);
    }

    // Upload original file
    const filename = generateFilename(file.name, "banners");
    console.log("[Banner Upload] Uploading to storage:", filename);

    const uploadResult = await uploadFile("banners", filename, file, {
      contentType: file.type,
    });

    if (!uploadResult.success) {
      console.error("[Banner Upload] Storage upload failed:", uploadResult.error);
      return c.json({ error: uploadResult.error }, 500);
    }

    // Generate public URL using Supabase storage
    const supabase = supabaseClient();
    const { data: urlData } = supabase.storage.from("banners").getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    console.log("[Banner Upload] Storage success! Public URL:", publicUrl);

    // Save to database - MINIMAL SAFE INSERT
    // Only using columns that should exist in basic banners table
    console.log("[Banner Upload] Attempting database insert with minimal fields...");

    const insertData: any = {
      title,
      description,
      image_url: publicUrl,
      thumbnail_url: publicUrl,
      order_index: 0,
      publish_status: publishStatus,
      banner_type: bannerType, // ✅ FIX: Save banner_type
      visibility: "public",    // ✅ FIX: Explicitly set visibility
    };

    // Add optional fields if provided
    if (folderId) insertData.folder_id = folderId;
    if (scheduledAt) insertData.scheduled_at = scheduledAt;
    if (targetUrl) insertData.target_url = targetUrl;

    const { data, error } = await supabase
      .from("banners")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[Banner Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log("[Banner Upload] Database insert success! ID:", data.id);

    // Trigger sync engine to update user cache
    if (publishStatus === "published") {
      console.log("[Banner Upload] Triggering sync for published banner...");
      await syncUserBanners(supabase);
    }

    await logAdminActivity("upload", "banner", data.id, { title, bannerType }, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Banner Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// TEMPLES ROUTES
// ====================================================================

export async function getTemples(c: Context) {
  try {
    const supabase = supabaseClient();
    const includeInactive = c.req.query("includeInactive") === "true";

    let query = supabase
      .from("temples")
      .select("*")
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Get Temples] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Get Temples] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function createTemple(c: Context) {
  try {
    const supabase = supabaseClient();
    const body = await c.req.json();

    const temple_name_ta = body.temple_name_ta as string;
    const temple_fame = body.temple_fame as string;
    const place = body.place as string;

    if (!temple_name_ta || !temple_fame || !place) {
      return c.json({ error: "temple_name_ta, temple_fame, place are required" }, 400);
    }

    const insertData = {
      ...body,
      search_key: buildTempleSearchKey({
        temple_name_ta,
        temple_name_en: body.temple_name_en ?? null,
        place,
      }),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("temples")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[Create Temple] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("create", "temple", data.id, { temple_name_ta, place }, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Create Temple] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function updateTemple(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();
    const body = await c.req.json();

    const { data: current, error: currentError } = await supabase
      .from("temples")
      .select("temple_name_ta, temple_name_en, place")
      .eq("id", id)
      .single();

    if (currentError) {
      console.error("[Update Temple] Fetch error:", currentError);
      return c.json({ error: currentError.message }, 500);
    }

    const nextTempleNameTa = (body.temple_name_ta ?? current.temple_name_ta) as string;
    const nextTempleNameEn = (body.temple_name_en ?? current.temple_name_en) as string | null;
    const nextPlace = (body.place ?? current.place) as string;

    const updateData = {
      ...body,
      search_key: buildTempleSearchKey({
        temple_name_ta: nextTempleNameTa,
        temple_name_en: nextTempleNameEn,
        place: nextPlace,
      }),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("temples")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Update Temple] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("update", "temple", id, body, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Update Temple] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteTemple(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { error } = await supabase.from("temples").delete().eq("id", id);

    if (error) {
      console.error("[Delete Temple] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("delete", "temple", id, {}, c);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Temple] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function bulkUpsertTemples(c: Context) {
  try {
    const supabase = supabaseClient();
    const body = await c.req.json();
    const rows = (Array.isArray(body) ? body : body?.rows) as any[];

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return c.json({ error: "rows array required" }, 400);
    }

    const payload = rows
      .filter(Boolean)
      .map((r) => {
        const temple_name_ta = (r.temple_name_ta || "").trim();
        const temple_fame = (r.temple_fame || "").trim();
        const place = (r.place || "").trim();

        return {
          ...r,
          temple_name_ta,
          temple_fame,
          place,
          search_key: buildTempleSearchKey({
            temple_name_ta,
            temple_name_en: r.temple_name_en ?? null,
            place,
          }),
          updated_at: new Date().toISOString(),
        };
      })
      .filter((r) => r.temple_name_ta && r.temple_fame && r.place);

    if (payload.length === 0) {
      return c.json({ success: true, data: [], inserted: 0 });
    }

    const { data, error } = await supabase
      .from("temples")
      .upsert(payload, { onConflict: "search_key,place" })
      .select();

    if (error) {
      console.error("[Bulk Upsert Temples] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity(
      "bulk_upsert",
      "temple",
      "bulk",
      { rows: payload.length },
      c,
    );

    return c.json({ success: true, data: data || [], inserted: payload.length });
  } catch (error: any) {
    console.error("[Bulk Upsert Temples] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Sync published banners to user cache
 */
async function syncUserBanners(supabase: any) {
  try {
    console.log("[Sync Engine] Syncing published BANNERS to user cache...");

    // Use minimal columns to avoid schema errors
    const { data: banners, error } = await supabase
      .from("banners")
      .select("id, title, description, image_url, thumbnail_url, order_index")
      .eq("publish_status", "published")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("[Sync Engine] Failed to fetch banners:", error);
      return;
    }

    // Store in KV store for fast user access - KEY: user_banners
    // Using static import kv instead of dynamic import
    await kv.set("user_banners", JSON.stringify(banners || []));
    await kv.set("user_banners_timestamp", Date.now().toString());

    console.log(`[Sync Engine] ✅ Synced ${banners?.length || 0} BANNERS to user_banners cache`);
  } catch (error) {
    console.error("[Sync Engine] Sync banners error:", error);
  }
}

export async function getBanners(c: Context) {
  try {
    const supabase = supabaseClient();
    const publishStatus = c.req.query("publishStatus") || null;

    let query = supabase.from("banners").select("*").order("created_at", { ascending: false });

    if (publishStatus) {
      query = query.eq("publish_status", publishStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Get Banners] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Get Banners] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function updateBanner(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    console.log("[Banner Update] Updating banner:", id, body);

    // Remove any fields that might not exist in the schema
    const { published_at, visibility, original_url, banner_type, ...safeBody } = body;

    console.log("[Banner Update] Safe update fields:", Object.keys(safeBody));

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("banners")
      .update(safeBody)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Banner Update] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log("[Banner Update] Success! New status:", data.publish_status);

    // Trigger sync whenever banner is updated
    console.log("[Banner Update] Triggering sync...");
    await syncUserBanners(supabase);

    await logAdminActivity("update", "banner", id, body, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Banner Update] Exception:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteBanner(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    // Get banner to delete file from storage
    const { data: banner } = await supabase.from("banners").select("storage_path").eq("id", id).single();

    if (banner?.storage_path) {
      await deleteFile("banners", banner.storage_path);
    }

    const { error } = await supabase.from("banners").delete().eq("id", id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("delete", "banner", id, {}, c);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// POPUP BANNERS ROUTES
// ====================================================================

export async function uploadPopupBanner(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || "";
    const publishStatus = (formData.get("publishStatus") as string) || "draft";
    const scheduledAt = (formData.get("scheduled_at") as string) || null;
    const startsAt = (formData.get("starts_at") as string) || null;
    const endsAt = (formData.get("ends_at") as string) || null;
    const targetUrl = (formData.get("target_url") as string) || null;
    const priorityRaw = (formData.get("priority") as string) || "0";
    const isEnabledRaw = (formData.get("is_enabled") as string) || "true";

    if (!file) {
      return c.json({ error: "File is required" }, 400);
    }

    const resolvedTitle = title.trim() || file.name.replace(/\.[^/.]+$/, "");
    const priority = Number.isFinite(Number(priorityRaw)) ? Number(priorityRaw) : 0;
    const is_enabled = isEnabledRaw === "false" ? false : true;

    const filename = generateFilename(file.name, "popup-banners");
    const uploadResult = await uploadFile("popup-banners", filename, file, {
      contentType: file.type,
    });

    if (!uploadResult.success) {
      return c.json({ error: uploadResult.error }, 500);
    }

    const publicUrl = getPublicUrl("popup-banners", filename);
    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("popup_banners")
      .insert({
        title: resolvedTitle,
        image_url: publicUrl,
        thumbnail_url: publicUrl,
        storage_path: filename,
        target_url: targetUrl,
        publish_status: publishStatus,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        is_enabled,
        priority,
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("upload", "popup_banner", data.id, { title: resolvedTitle }, c);
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Popup Banner Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function getPopupBanners(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("popup_banners")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function updatePopupBanner(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("popup_banners")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);

    await logAdminActivity("update", "popup_banner", id, body, c);
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function deletePopupBanner(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { data: row } = await supabase
      .from("popup_banners")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (row?.storage_path) {
      await deleteFile("popup-banners", row.storage_path);
    }

    const { error } = await supabase.from("popup_banners").delete().eq("id", id);
    if (error) return c.json({ error: error.message }, 500);

    await logAdminActivity("delete", "popup_banner", id, {}, c);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// Public endpoint for the app: returns the highest priority active popup banner.
export async function getActivePopupBanner(c: Context) {
  try {
    const supabase = supabaseClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("popup_banners")
      .select("*")
      .eq("publish_status", "published")
      .eq("is_enabled", true)
      .eq("is_active", true)
      .eq("force_show", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("priority", { ascending: false })
      .order("pushed_at", { ascending: false })
      .limit(1);

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, data: (data && data[0]) || null });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function pushPopupBanner(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { data: banner, error: fetchError } = await supabase
      .from("popup_banners")
      .select("id,image_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) return c.json({ error: fetchError.message }, 500);
    if (!banner) return c.json({ error: "Banner not found" }, 404);
    if (!banner.image_url) return c.json({ error: "Banner image must be uploaded before pushing" }, 400);

    const nowIso = new Date().toISOString();

    const { error: deactivateError } = await supabase
      .from("popup_banners")
      .update({
        is_active: false,
        force_show: false,
        updated_at: nowIso,
      })
      .neq("id", id);

    if (deactivateError) {
      return c.json({ error: deactivateError.message }, 500);
    }

    const { data: updated, error: updateError } = await supabase
      .from("popup_banners")
      .update({
        publish_status: "published",
        is_active: true,
        force_show: true,
        pushed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return c.json({ error: updateError.message }, 500);

    await logAdminActivity("push", "popup_banner", id, {}, c);
    return c.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[Popup Banner Push] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function replacePopupBannerImage(c: Context) {
  try {
    const id = c.req.param("id");
    const formData = await c.req.formData();

    const fileRaw = formData.get("file");
    const file =
      fileRaw instanceof File
        ? fileRaw
        : fileRaw instanceof Blob
          ? new File([fileRaw], "upload", { type: fileRaw.type })
          : null;

    if (!file) {
      return c.json({ error: "file is required" }, 400);
    }

    const supabase = supabaseClient();
    const { data: existing, error: fetchError } = await supabase
      .from("popup_banners")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) return c.json({ error: fetchError.message }, 500);
    if (!existing) return c.json({ error: "Banner not found" }, 404);

    if (existing.storage_path) {
      await deleteFile("popup-banners", existing.storage_path);
    }

    const filename = generateFilename(file.name, "popup-banners");
    const uploadResult = await uploadFile("popup-banners", filename, file, {
      contentType: file.type,
    });

    if (!uploadResult.success) {
      return c.json({ error: uploadResult.error }, 500);
    }

    const publicUrl = getPublicUrl("popup-banners", filename);
    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("popup_banners")
      .update({
        image_url: publicUrl,
        thumbnail_url: publicUrl,
        storage_path: filename,
        updated_at: nowIso,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return c.json({ error: updateError.message }, 500);

    await logAdminActivity("upload", "popup_banner_image", id, {}, c);
    return c.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[Popup Banner Image Replace] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// WALLPAPER ROUTES
// ====================================================================

export async function uploadWallpaper(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string;
    const tags = formData.get("tags") as string;
    const publishStatus = formData.get("publishStatus") as string || "draft";
    const folderId = formData.get("folder_id") as string;
    const scheduledAt = formData.get("scheduled_at") as string;
    const metadataRaw = formData.get("metadata") as string;
    const isVideo = file.type.startsWith("video/");

    if (!file) {
      return c.json({ error: "File is required" }, 400);
    }

    // Title is optional - use filename if not provided
    const finalTitle = title || file.name.replace(/\.[^/.]+$/, "");

    let metadata: any = {};
    if (metadataRaw) {
      try {
        metadata = JSON.parse(metadataRaw);
      } catch {
        metadata = {};
      }
    }

    const filename = generateFilename(file.name, "wallpapers");
    const uploadResult = await uploadFile("wallpapers", filename, file, {
      contentType: file.type,
    });

    if (!uploadResult.success) {
      return c.json({ error: uploadResult.error }, 500);
    }

    const imageUrl = getPublicUrl("wallpapers", filename);
    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("wallpapers")
      .insert({
        title: finalTitle,
        description,
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        small_url: imageUrl,
        medium_url: imageUrl,
        large_url: imageUrl,
        original_url: imageUrl,
        storage_path: filename,
        is_video: isVideo,
        video_url: isVideo ? imageUrl : null,
        folder_id: folderId || null,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        publish_status: publishStatus,
        visibility: "public", // 🔥 CRITICAL FIX: Always set visibility to public
        published_at: publishStatus === "published" ? new Date().toISOString() : null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null, // 🔥 FIX: Save scheduled_at to database
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error("[Wallpaper Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[uploadWallpaper] ✅ Wallpaper created with scheduled_at:`, {
      id: data.id,
      publish_status: data.publish_status,
      scheduled_at: data.scheduled_at
    });

    await logAdminActivity("upload", "wallpaper", data.id, { title: finalTitle, isVideo }, c);

    // Trigger sync engine to update user cache
    console.log("[Wallpaper Upload] Triggering wallpaper sync...");
    await syncUserWallpapers(supabase);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Wallpaper Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Sync published wallpapers to user cache (SEPARATE from banners)
 */
async function syncUserWallpapers(supabase: any) {
  try {
    console.log("[Sync Engine] Syncing published WALLPAPERS to user cache...");

    const { data: wallpapers, error } = await supabase
      .from("wallpapers")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Sync Engine] Failed to fetch wallpapers:", error);
      return;
    }

    // Store in KV store for fast user access - KEY: user_wallpapers
    // Using static import kv instead of dynamic import
    await kv.set("user_wallpapers", JSON.stringify(wallpapers || []));
    await kv.set("user_wallpapers_timestamp", Date.now().toString());

    console.log(`[Sync Engine] ✅ Synced ${wallpapers?.length || 0} WALLPAPERS to user_wallpapers cache`);
  } catch (error) {
    console.error("[Sync Engine] Sync wallpapers error:", error);
  }
}

export async function getWallpapers(c: Context) {
  try {
    const supabase = supabaseClient();
    const publishStatus = c.req.query("publishStatus") || null;
    const featured = c.req.query("featured") || null;

    let query = supabase
      .from("wallpapers")
      .select("*")
      .order("created_at", { ascending: false });

    if (publishStatus) {
      query = query.eq("publish_status", publishStatus);
    }

    if (featured) {
      query = query.eq("is_featured", true);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // scheduled_at is now stored in database, no need to merge from KV store
    console.log(`[getWallpapers] ✅ Fetched ${data?.length || 0} wallpapers from database`);

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function updateWallpaper(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    console.log(`[updateWallpaper] Updating wallpaper ${id} with body:`, body);

    const supabase = supabaseClient();

    // Prepare update object - include scheduled_at in database update
    const updateData: any = { ...body };

    // Convert scheduled_at to ISO string if present
    if (updateData.scheduled_at !== undefined) {
      updateData.scheduled_at = updateData.scheduled_at ? new Date(updateData.scheduled_at).toISOString() : null;
    }

    console.log(`[updateWallpaper] Updating database fields:`, updateData);
    const result = await supabase
      .from("wallpapers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (result.error) {
      console.error(`[updateWallpaper] Database update error:`, result.error);
      return c.json({ error: result.error.message }, 500);
    }

    console.log(`[updateWallpaper] ✅ Wallpaper updated:`, {
      id: result.data.id,
      publish_status: result.data.publish_status,
      scheduled_at: result.data.scheduled_at
    });

    await logAdminActivity("update", "wallpaper", id, body, c);

    const response = {
      success: true,
      data: {
        ...result.data,
        scheduled_at: result.data.scheduled_at || null
      }
    };

    console.log(`[updateWallpaper] ✅ Success! Returning:`, response);
    return c.json(response);
  } catch (error: any) {
    console.error(`[updateWallpaper] ❌ Error:`, error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteWallpaper(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { data: wallpaper } = await supabase.from("wallpapers").select("storage_path").eq("id", id).single();

    if (wallpaper?.storage_path) {
      await deleteFile("wallpapers", wallpaper.storage_path);
    }

    const { error } = await supabase.from("wallpapers").delete().eq("id", id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // Clean up scheduling info from KV store
    // Using static import kv instead of dynamic import
    await kv.del(`wallpaper:schedule:${id}`);

    await logAdminActivity("delete", "wallpaper", id, {}, c);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// MEDIA ROUTES (Audio, Video, YouTube)
// ====================================================================

// ✅ NEW: Fetch YouTube metadata endpoint
export async function fetchYouTubeMetadata(c: Context) {
  try {
    const body = await c.req.json();
    const { youtubeUrl } = body;

    if (!youtubeUrl) {
      return c.json({ error: "YouTube URL is required" }, 400);
    }

    // Extract YouTube ID
    const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    const youtubeId = match ? match[1] : null;

    if (!youtubeId) {
      return c.json({ error: "Invalid YouTube URL" }, 400);
    }

    // Fetch metadata from YouTube oEmbed API (no API key required)
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;

    try {
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch YouTube metadata");
      }

      const data = await response.json();

      return c.json({
        success: true,
        data: {
          youtubeId,
          title: data.title || "Untitled",
          thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
          video_url: youtubeUrl,
          channel: data.author_name || "Unknown",
          embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
          type: "video", // Can be changed to "song" by user
        },
      });
    } catch (fetchError: any) {
      console.error("[YouTube Fetch] oEmbed API error:", fetchError);

      // Fallback: Return basic info from URL
      return c.json({
        success: true,
        data: {
          youtubeId,
          title: "YouTube Video", // User will need to edit this
          thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
          video_url: youtubeUrl,
          channel: "Unknown",
          embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
          type: "video",
        },
      });
    }
  } catch (error: any) {
    console.error("[YouTube Fetch] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function uploadMedia(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const artist = formData.get("artist") as string;
    const mediaType = formData.get("mediaType") as string; // audio, video, youtube
    const youtubeUrl = formData.get("youtubeUrl") as string;
    const category = formData.get("category") as string; // ✅ Changed from categoryId
    const tags = formData.get("tags") as string;
    const publishStatus = formData.get("publishStatus") as string || "draft";
    const contentType = formData.get("contentType") as string; // ✅ NEW: for youtube uploads (audio/video)

    console.log("[Media Upload] Received:", { title, mediaType, category, publishStatus, contentType });

    if (!title || !mediaType) {
      return c.json({ error: "Title and media type are required" }, 400);
    }

    let fileUrl = null;
    let storagePath = null;
    let youtubeId = null;
    let thumbnailUrl = null;

    // ✅ FIX: Determine the actual media type to store in database
    // For YouTube, use contentType (audio/video), not "youtube"
    let actualMediaType = mediaType;
    if (mediaType === "youtube") {
      // Use contentType if provided (audio/video), otherwise default to "video"
      actualMediaType = contentType || "video";
    }

    // Handle YouTube
    if (mediaType === "youtube") {
      if (!youtubeUrl) {
        return c.json({ error: "YouTube URL is required" }, 400);
      }
      // Extract YouTube ID
      const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
      youtubeId = match ? match[1] : null;
      fileUrl = youtubeUrl;
      thumbnailUrl = formData.get("thumbnailUrl") as string || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    } else {
      // Handle file upload
      if (!file) {
        return c.json({ error: "File is required for non-YouTube media" }, 400);
      }

      const filename = generateFilename(file.name, "media");
      const uploadResult = await uploadFile("media", filename, file, {
        contentType: file.type,
      });

      if (!uploadResult.success) {
        return c.json({ error: uploadResult.error }, 500);
      }

      storagePath = filename;
      fileUrl = getPublicUrl("media", filename);
      thumbnailUrl = formData.get("thumbnailUrl") as string || fileUrl;
    }

    const supabase = supabaseClient();

    // ✅ Handle category: Look up or create
    let categoryId = null;
    if (category) {
      // Generate slug first (for lookup and potential insert)
      const slug = category.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

      // First, try to find existing category by slug (more reliable than name)
      const { data: existingCategory } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .eq("type", "media")
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
        console.log("[Media Upload] Found existing category:", categoryId);
      } else {
        // Try to create new category, but handle duplicate slug gracefully
        const { data: newCategory, error: catError } = await supabase
          .from("categories")
          .insert({
            name: category,
            slug: slug,
            type: "media",
          })
          .select()
          .single();

        if (catError) {
          console.error("[Media Upload] Category creation error:", catError);

          // If duplicate slug error (23505), try to fetch the existing category one more time
          if (catError.code === "23505") {
            console.log("[Media Upload] Duplicate slug detected, fetching existing category...");
            const { data: retryCategory } = await supabase
              .from("categories")
              .select("id")
              .eq("slug", slug)
              .eq("type", "media")
              .single();

            if (retryCategory) {
              categoryId = retryCategory.id;
              console.log("[Media Upload] Retrieved existing category after duplicate:", categoryId);
            }
          }
          // If still no category, continue without it (categoryId remains null)
        } else {
          categoryId = newCategory.id;
          console.log("[Media Upload] Created new category:", categoryId);
        }
      }
    }

    // ✅ Insert media record with correct media_type
    console.log("[Media Upload] Inserting with media_type:", actualMediaType);
    const { data, error } = await supabase
      .from("media")
      .insert({
        title,
        description,
        artist,
        media_type: actualMediaType, // ✅ FIX: Use "audio" or "video", not "youtube"
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        youtube_id: youtubeId,
        youtube_url: youtubeUrl || null,
        storage_path: storagePath,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        publish_status: publishStatus,
        published_at: publishStatus === "published" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Media Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log("[Media Upload] Success:", data.id);

    await logAdminActivity("upload", "media", data.id, { title, mediaType: actualMediaType }, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Media Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function getMedia(c: Context) {
  try {
    const supabase = supabaseClient();
    const publishStatus = c.req.query("publishStatus") || null;
    const mediaType = c.req.query("mediaType") || null;
    const categoryId = c.req.query("categoryId") || null;

    let query = supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

    if (publishStatus) {
      query = query.eq("publish_status", publishStatus);
    }

    if (mediaType) {
      query = query.eq("media_type", mediaType);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function updateMedia(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("media")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("update", "media", id, body, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteMedia(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { data: media } = await supabase.from("media").select("storage_path").eq("id", id).single();

    if (media?.storage_path) {
      await deleteFile("media", media.storage_path);
    }

    const { error } = await supabase.from("media").delete().eq("id", id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("delete", "media", id, {}, c);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// PHOTO ROUTES
// ====================================================================

export async function uploadPhoto(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string;
    const tags = formData.get("tags") as string;
    const publishStatus = formData.get("publishStatus") as string || "draft";

    if (!file || !title) {
      return c.json({ error: "File and title are required" }, 400);
    }

    const filename = generateFilename(file.name, "photos");
    const uploadResult = await uploadFile("photos", filename, file, {
      contentType: file.type,
    });

    if (!uploadResult.success) {
      return c.json({ error: uploadResult.error }, 500);
    }

    const imageUrl = getPublicUrl("photos", filename);
    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("photos")
      .insert({
        title,
        description,
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        small_url: imageUrl,
        medium_url: imageUrl,
        large_url: imageUrl,
        original_url: imageUrl,
        storage_path: filename,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        publish_status: publishStatus,
        published_at: publishStatus === "published" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Photo Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("upload", "photo", data.id, { title }, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Photo Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function getPhotos(c: Context) {
  try {
    const supabase = supabaseClient();
    const publishStatus = c.req.query("publishStatus") || null;
    const categoryId = c.req.query("categoryId") || null;

    let query = supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (publishStatus) {
      query = query.eq("publish_status", publishStatus);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function updatePhoto(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("photos")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("update", "photo", id, body, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function deletePhoto(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { data: photo } = await supabase.from("photos").select("storage_path").eq("id", id).single();

    if (photo?.storage_path) {
      await deleteFile("photos", photo.storage_path);
    }

    const { error } = await supabase.from("photos").delete().eq("id", id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("delete", "photo", id, {}, c);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// SPARKLE (NEWS/ARTICLES) ROUTES
// ====================================================================

export async function uploadSparkle(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const videoFile = formData.get("video") as File | null;
    const title = formData.get("title") as string;
    const subtitle = formData.get("subtitle") as string;
    const content = formData.get("content") as string;
    const contentJson = formData.get("contentJson") as string;
    const author = formData.get("author") as string;
    const categoryId = formData.get("categoryId") as string;
    const tags = formData.get("tags") as string;
    const publishStatus = formData.get("publishStatus") as string || "draft";

    // Title is optional - fall back to uploaded filename for videos/images.
    const inferredTitle =
      (file?.name || videoFile?.name || "").replace(/\.[^/.]+$/, "");
    const finalTitle = (title || "").trim() || inferredTitle;

    // Auto-generate content from content/title if not provided
    const finalContent = (content || "").trim() || finalTitle || " ";

    const metadataRaw = formData.get("metadata") as string;
    let metadata: any = {};
    if (metadataRaw) {
      try {
        metadata = JSON.parse(metadataRaw);
      } catch {
        metadata = {};
      }
    }

    let coverImageUrl = null;
    let storagePath = null;
    let videoUrl: string | null = null;
    let videoStoragePath: string | null = null;

    if (file) {
      const filename = generateFilename(file.name, "sparkle");
      const uploadResult = await uploadFile("sparkle", filename, file, {
        contentType: file.type,
      });

      if (!uploadResult.success) {
        return c.json({ error: uploadResult.error }, 500);
      }

      storagePath = filename;
      coverImageUrl = getPublicUrl("sparkle", filename);
    }

    // Optional: handle attached video file for sparkle videos
    if (videoFile) {
      // Basic validation: only allow video content types and a reasonable size (~200MB)
      if (!videoFile.type.startsWith("video/")) {
        return c.json({ error: "Invalid video file type" }, 400);
      }

      if (videoFile.size > 200 * 1024 * 1024) {
        return c.json({ error: "Video file too large (max 200MB)" }, 400);
      }

      const videoFilename = generateFilename(videoFile.name, "sparkle-videos");
      console.log("[uploadSparkle] Video filename generated:", videoFilename);
      
      const videoUploadResult = await uploadFile("sparkle", videoFilename, videoFile, {
        contentType: videoFile.type || "video/mp4",
      });

      if (!videoUploadResult.success) {
        console.error("[uploadSparkle] Video upload failed:", videoUploadResult.error);
        return c.json({ error: videoUploadResult.error }, 500);
      }

      videoStoragePath = videoFilename;
      videoUrl = getPublicUrl("sparkle", videoFilename);
      console.log("[uploadSparkle] Video URL generated:", videoUrl);
    }

    console.log("[uploadSparkle] Preparing to insert:", {
      title: finalTitle,
      subtitle,
      hasVideo: !!videoUrl,
      hasCoverImage: !!coverImageUrl,
      videoUrl,
      coverImageUrl,
      publishStatus,
    });

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("sparkle")
      .insert({
        title: finalTitle,
        subtitle,
        content: finalContent,
        content_json: contentJson ? JSON.parse(contentJson) : null,
        cover_image_url: coverImageUrl,
        thumbnail_url: coverImageUrl,
        storage_path: storagePath,
        author,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        publish_status: publishStatus,
        published_at: publishStatus === "published" ? new Date().toISOString() : null,
        video_url: videoUrl,
        video_id: videoUrl ? `s_${Date.now()}_${crypto.randomUUID().slice(0, 4)}` : null,
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error("[Sparkle Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log("[uploadSparkle] Successfully inserted:", {
      id: data.id,
      title: data.title,
      video_url: data.video_url,
      video_id: data.video_id,
      cover_image_url: data.cover_image_url,
      publish_status: data.publish_status,
    });

    await logAdminActivity("upload", "sparkle", data.id, { title }, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Sparkle Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function getSparkle(c: Context) {
  try {
    const supabase = supabaseClient();
    const publishStatus = c.req.query("publishStatus") || null;
    const categoryId = c.req.query("categoryId") || null;
    const featured = c.req.query("featured") || null;
    const debug = c.req.query("debug") === "true";

    let query = supabase
      .from("sparkle")
      .select("*")
      .order("published_at", { ascending: false });

    if (publishStatus) {
      query = query.eq("publish_status", publishStatus);
    }

    if (featured) {
      query = query.eq("is_featured", true);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    const videoSparkles = data?.filter((s: any) => s.video_url) || [];
    const imageSparkles = data?.filter((s: any) => !s.video_url && (s.cover_image_url || s.thumbnail_url)) || [];
    const problematicSparkles = data?.filter((s: any) => !s.video_url && !s.cover_image_url && !s.thumbnail_url) || [];

    console.log("[getSparkle] Returning sparkles:", {
      total: data?.length || 0,
      withVideo: videoSparkles.length,
      withCoverImage: data?.filter((s: any) => s.cover_image_url).length || 0,
      withImagesOnly: imageSparkles.length,
      problematic: problematicSparkles.length,
      sample: data?.[0] ? {
        id: data[0].id,
        title: data[0].title,
        video_url: data[0].video_url,
        cover_image_url: data[0].cover_image_url,
        publish_status: data[0].publish_status,
      } : null,
    });

    if (debug) {
      // Return detailed info for debugging
      return c.json({ 
        success: true, 
        data,
        debug: {
          total: data?.length || 0,
          videoSparkles: videoSparkles.length,
          imageSparkles: imageSparkles.length,
          problematicSparkles: problematicSparkles.length,
          videoUrls: videoSparkles.map((s: any) => ({ id: s.id, title: s.title, video_url: s.video_url })),
          problematicIds: problematicSparkles.map((s: any) => ({ id: s.id, title: s.title }))
        }
      });
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function updateSparkle(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("sparkle")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("update", "sparkle", id, body, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteSparkle(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    // Fetch paths for both cover image and video
    const { data: sparkle } = await supabase
      .from("sparkle")
      .select("storage_path, video_url")
      .eq("id", id)
      .single();

    // Delete cover image if present
    if (sparkle?.storage_path) {
      await deleteFile("sparkle", sparkle.storage_path);
    }

    // Delete video file if present and hosted in this sparkle bucket
    if (sparkle?.video_url) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const publicPrefix = `${supabaseUrl}/storage/v1/object/public/sparkle/`;

        if (sparkle.video_url.startsWith(publicPrefix)) {
          const videoPath = sparkle.video_url.slice(publicPrefix.length);
          await deleteFile("sparkle", videoPath);
        } else {
          console.warn("[deleteSparkle] Skipping video delete - not in sparkle bucket:", sparkle.video_url);
        }
      } catch (e) {
        console.error("[deleteSparkle] Error deleting video file:", e);
      }
    }

    const { error } = await supabase.from("sparkle").delete().eq("id", id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("delete", "sparkle", id, {}, c);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// BANNER FOLDERS ROUTES
// ====================================================================

export async function getBannerFolders(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("banner_folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Get Banner Folders] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Get Banner Folders] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function createBannerFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({ error: "Folder name is required" }, 400);
    }

    const { data, error } = await supabase
      .from("banner_folders")
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      console.error("[Create Banner Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Create Banner Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function updateBannerFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description } = body;

    const { data, error } = await supabase
      .from("banner_folders")
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Update Banner Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Update Banner Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteBannerFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");

    const { error } = await supabase
      .from("banner_folders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Delete Banner Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Banner Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// MEDIA FOLDERS ROUTES
// ====================================================================

export async function getMediaFolders(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("media_folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Get Media Folders] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Get Media Folders] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function createMediaFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({ error: "Folder name is required" }, 400);
    }

    const { data, error } = await supabase
      .from("media_folders")
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      console.error("[Create Media Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Create Media Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function updateMediaFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description } = body;

    const { data, error } = await supabase
      .from("media_folders")
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Update Media Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Update Media Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteMediaFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");

    const { error } = await supabase
      .from("media_folders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Delete Media Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Media Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// SPARKLE FOLDERS ROUTES
// ====================================================================

export async function getSparkleFolders(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("sparkle_folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Get Sparkle Folders] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Get Sparkle Folders] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function createSparkleFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({ error: "Folder name is required" }, 400);
    }

    const { data, error } = await supabase
      .from("sparkle_folders")
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      console.error("[Create Sparkle Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Create Sparkle Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function updateSparkleFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description } = body;

    const { data, error } = await supabase
      .from("sparkle_folders")
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Update Sparkle Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Update Sparkle Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteSparkleFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");

    const { error } = await supabase
      .from("sparkle_folders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Delete Sparkle Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Sparkle Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// CATEGORIES ROUTES
// ====================================================================

export async function getCategories(c: Context) {
  try {
    const supabase = supabaseClient();
    const type = c.req.query("type") || null;

    let query = supabase.from("categories").select("*").order("name");

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// STORAGE MONITOR ROUTES
// ====================================================================

export async function getStorageStats(c: Context) {
  try {
    const supabase = supabaseClient();

    // Define the buckets we want to monitor
    const buckets = ['wallpapers', 'banners', 'media', 'photos', 'sparkle'];

    // We'll aggregate stats by iterating each bucket
    // Note: We can only list top-level files or we need recursive listing for folders.
    // For now, we assume a flat structure or just check the root.
    // If folders exist (like in wallpapers), we should try to list recursively or simply accept this is an an approximation.
    // Since `storage.objects` schema access requires special permissions/config, this is the safer fallback.

    const bucketStatsPromises = buckets.map(async (bucketName) => {
      try {
        // Limit to 1000 files for performance check
        const { data, error } = await supabase.storage.from(bucketName).list('', { limit: 1000, offset: 0 });

        if (error) {
          console.warn(`[Storage Stats] Error listing bucket ${bucketName}:`, error);
          return { name: bucketName, size: 0, count: 0 };
        }

        if (!data) return { name: bucketName, size: 0, count: 0 };

        // Aggregate size and count
        const totalSize = data.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
        const count = data.length;

        return {
          name: bucketName,
          size: totalSize,
          count: count
        };
      } catch (err) {
        console.error(`[Storage Stats] Exception for bucket ${bucketName}:`, err);
        return { name: bucketName, size: 0, count: 0 };
      }
    });

    const results = await Promise.all(bucketStatsPromises);

    return c.json({
      success: true,
      data: results,
      totalSize: results.reduce((acc, curr) => acc + curr.size, 0)
    });
  } catch (error: any) {
    console.error("[Storage Stats] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}