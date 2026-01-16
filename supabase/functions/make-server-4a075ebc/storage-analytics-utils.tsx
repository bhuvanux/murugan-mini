import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseClient = () =>
    createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

/**
 * Track file upload in storage_assets table
 */
export async function track_file_upload(
    filePath: string,
    fileName: string,
    module: string,
    fileType: string,
    originalSize: number,
    optimizedSize: number | null = null,
    metadata: any = {}
) {
    try {
        const supabase = supabaseClient();

        // Calculate compression ratio if optimized
        let compressionRatio = null;
        if (optimizedSize !== null && originalSize > 0) {
            compressionRatio = Math.round(((originalSize - optimizedSize) / originalSize) * 100 * 100) / 100;
        }

        const { data, error } = await supabase
            .from("storage_assets")
            .upsert({
                file_path: filePath,
                file_name: fileName,
                module,
                file_type: fileType,
                original_size: originalSize,
                optimized_size: optimizedSize,
                is_optimized: optimizedSize !== null && optimizedSize < originalSize,
                compression_ratio: compressionRatio,
                metadata,
                upload_date: new Date().toISOString()
            }, { onConflict: 'file_path' })
            .select()
            .single();

        if (error) {
            console.error("[Storage Track] DB Error:", error);
            return null;
        }

        return data.id;
    } catch (err) {
        console.error("[Storage Track] Exception:", err);
        return null;
    }
}
