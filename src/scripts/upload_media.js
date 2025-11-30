#!/usr/bin/env node
/**
 * Murugan Wallpapers & Videos - Bulk Media Upload Script
 * 
 * This script uploads images from a local directory to Supabase Storage
 * and creates database entries with metadata.
 * 
 * Prerequisites:
 * - Node.js 18+
 * - npm install @supabase/supabase-js sharp fast-glob
 * 
 * Usage:
 * - Set environment variables: SUPABASE_URL, SUPABASE_KEY
 * - Place images in ./assets-to-upload directory
 * - Run: node scripts/upload_media.js
 * 
 * Filename format (optional):
 * - <slug>__<title>__<tag1>,<tag2>.jpg
 * - Example: palani__Palani Temple Murugan__temple,murugan,deity.jpg
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fg from 'fast-glob';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET = 'public-media';
const LOCAL_DIR = process.env.LOCAL_DIR || path.join(__dirname, '../assets-to-upload');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Set SUPABASE_URL and SUPABASE_KEY environment variables');
  console.error('   Example: export SUPABASE_URL=https://xxx.supabase.co');
  console.error('            export SUPABASE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper functions
function slugify(s) {
  return s.toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseFilename(fname) {
  const base = path.basename(fname, path.extname(fname));
  const parts = base.split('__');
  
  if (parts.length >= 2) {
    const title = parts[1].replace(/-/g, ' ');
    const tags = (parts[2] || '').split(',').filter(Boolean).map(t => t.trim().toLowerCase());
    return { title, tags };
  }
  
  // Fallback: use filename as title
  const title = base.replace(/[-_]/g, ' ');
  const tags = base.split(/[\s\-_]+/).slice(0, 3).map(t => t.toLowerCase());
  return { title, tags };
}

async function uploadBuffer(pathInBucket, buffer, contentType = 'image/jpeg') {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(pathInBucket, buffer, {
      contentType,
      cacheControl: 'public, max-age=86400, s-maxage=2592000',
      upsert: false
    });
  
  if (error) throw error;
  return data;
}

async function uploadImage(filePath, fname) {
  const datePrefix = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const unique = crypto.randomBytes(8).toString('hex');
  const slug = slugify(path.basename(fname, path.extname(fname)));
  
  const bucketOrg = `images/original/${datePrefix}/${unique}_${slug}.jpg`;
  const bucketWeb = `images/web/${datePrefix}/${unique}_web.jpg`;
  const bucketThumb = `images/thumb/${datePrefix}/${unique}_thumb.jpg`;
  
  try {
    const buffer = fs.readFileSync(filePath);
    
    console.log(`  📁 Processing: ${fname}`);
    
    // Upload original
    console.log(`    ⬆️  Uploading original...`);
    await uploadBuffer(bucketOrg, buffer);
    
    // Generate and upload web size (1280px max)
    console.log(`    🖼️  Creating web version (1280px)...`);
    const webBuf = await sharp(buffer)
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    await uploadBuffer(bucketWeb, webBuf);
    
    // Generate and upload thumbnail (640px)
    console.log(`    🖼️  Creating thumbnail (640px)...`);
    const thumbBuf = await sharp(buffer)
      .resize({ width: 640, height: 640, fit: 'cover' })
      .jpeg({ quality: 75 })
      .toBuffer();
    await uploadBuffer(bucketThumb, thumbBuf);
    
    // Parse metadata from filename
    const { title, tags } = parseFilename(fname);
    
    // Get image dimensions
    const metadata = await sharp(buffer).metadata();
    
    // Insert into database
    console.log(`    💾 Saving to database...`);
    const { data, error } = await supabase
      .from('media')
      .insert([{
        kind: 'image',
        title: title || fname,
        description: `High quality Murugan devotional wallpaper - ${title}`,
        filename: fname,
        storage_path: bucketOrg,
        web_path: bucketWeb,
        thumb_path: bucketThumb,
        tags: tags.length > 0 ? tags : ['murugan', 'wallpaper'],
        allow_download: true,
        visibility: 'public',
        metadata: {
          uploaded_from: 'bulk-upload-script',
          original_width: metadata.width,
          original_height: metadata.height,
          format: metadata.format,
        }
      }])
      .select()
      .single();
    
    if (error) {
      console.error(`    ❌ DB insert error: ${error.message}`);
      return { success: false, error };
    }
    
    console.log(`    ✅ Success! ID: ${data.id}`);
    return { success: true, data };
    
  } catch (e) {
    console.error(`    ❌ Upload failed: ${e.message}`);
    return { success: false, error: e };
  }
}

async function main() {
  console.log('🚀 Murugan Wallpapers Bulk Upload Script\n');
  console.log(`📂 Scanning directory: ${LOCAL_DIR}\n`);
  
  if (!fs.existsSync(LOCAL_DIR)) {
    console.error(`❌ Directory not found: ${LOCAL_DIR}`);
    console.error(`   Create it and add your images, then run again.`);
    process.exit(1);
  }
  
  // Find all image files
  const files = await fg(['**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}'], { 
    cwd: LOCAL_DIR,
    absolute: false 
  });
  
  if (files.length === 0) {
    console.log('❌ No images found in directory.');
    console.log('   Add .jpg, .png, or .webp files and try again.\n');
    process.exit(0);
  }
  
  console.log(`📸 Found ${files.length} image(s)\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    const filePath = path.join(LOCAL_DIR, file);
    const result = await uploadImage(filePath, file);
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    
    console.log(''); // blank line between files
  }
  
  console.log('═'.repeat(60));
  console.log(`✨ Upload Complete!\n`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📊 Total: ${files.length}\n`);
  
  if (successCount > 0) {
    console.log(`🎉 Your media is now available in the app!`);
    console.log(`   View at: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/\n`);
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
