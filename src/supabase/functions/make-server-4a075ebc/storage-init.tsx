/**
 * Storage Bucket Initialization
 * Creates all required Supabase Storage buckets for the Murugan App
 */

import { createClient } from "npm:@supabase/supabase-js@2";

interface BucketConfig {
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes?: string[];
}

const BUCKETS: BucketConfig[] = [
  {
    name: "banners",
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"],
  },
  {
    name: "wallpapers",
    public: true,
    fileSizeLimit: 20971520, // 20MB
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "video/mp4"],
  },
  {
    name: "media",
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ["audio/mpeg", "audio/mp3", "video/mp4", "audio/wav"],
  },
  {
    name: "photos",
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"],
  },
  {
    name: "sparkle",
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"],
  },
  {
    name: "ai-logs",
    public: false,
    fileSizeLimit: 1048576, // 1MB
    allowedMimeTypes: ["application/json", "text/plain"],
  },
  {
    name: "user-uploads",
    public: false,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png"],
  },
  {
    name: "thumbnails",
    public: true,
    fileSizeLimit: 2097152, // 2MB
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
];

/**
 * Initialize all storage buckets
 */
export async function initializeStorageBuckets() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  console.log("[Storage Init] Starting bucket initialization...");

  // Get existing buckets
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("[Storage Init] Error listing buckets:", listError);
    return;
  }

  const existingBucketNames = existingBuckets?.map((b) => b.name) || [];

  // Create missing buckets
  for (const bucketConfig of BUCKETS) {
    if (existingBucketNames.includes(bucketConfig.name)) {
      console.log(`[Storage Init] ✓ Bucket "${bucketConfig.name}" already exists`);
      continue;
    }

    console.log(`[Storage Init] Creating bucket "${bucketConfig.name}"...`);

    const { error: createError } = await supabase.storage.createBucket(bucketConfig.name, {
      public: bucketConfig.public,
      fileSizeLimit: bucketConfig.fileSizeLimit,
      allowedMimeTypes: bucketConfig.allowedMimeTypes,
    });

    if (createError) {
      console.error(`[Storage Init] ✗ Error creating bucket "${bucketConfig.name}":`, createError);
    } else {
      console.log(`[Storage Init] ✓ Created bucket "${bucketConfig.name}"`);
    }
  }

  console.log("[Storage Init] ✓ All buckets initialized successfully");
}

/**
 * Get public URL for a file in storage
 */
export function getPublicUrl(bucketName: string, filePath: string): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
}

/**
 * Get signed URL for a private file
 */
export async function getSignedUrl(
  bucketName: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error(`[Storage] Error creating signed URL:`, error);
    return null;
  }

  return data?.signedUrl || null;
}

/**
 * Delete file from storage
 */
export async function deleteFile(bucketName: string, filePath: string): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.storage.from(bucketName).remove([filePath]);

  if (error) {
    console.error(`[Storage] Error deleting file:`, error);
    return false;
  }

  return true;
}

/**
 * Upload file to storage
 */
export async function uploadFile(
  bucketName: string,
  filePath: string,
  file: File | Blob,
  options?: { contentType?: string; cacheControl?: string }
): Promise<{ success: boolean; path?: string; error?: string }> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
    contentType: options?.contentType,
    cacheControl: options?.cacheControl || "3600",
    upsert: false,
  });

  if (error) {
    console.error(`[Storage] Upload error:`, error);
    return { success: false, error: error.message };
  }

  return { success: true, path: data.path };
}
