# 📤 Media Upload Scripts

This directory contains scripts for bulk uploading media to Supabase.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd scripts
npm install
```

### 2. Set Environment Variables
```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=your-service-role-key
```

Or create a `.env` file:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
LOCAL_DIR=../assets-to-upload
```

### 3. Add Images
Place your images in `../assets-to-upload/`

### 4. Run Upload
```bash
npm run upload
```

---

## 📁 Filename Format

### Recommended Format
```
<slug>__<title>__<tag1>,<tag2>,<tag3>.<ext>
```

### Examples

#### ✅ Good Filenames
```
palani-temple__Palani Murugan Temple__temple,murugan,palani.jpg
kanda-sashti__Kanda Sashti Kavacam__devotional,song,chant.jpg
vel-weapon__Sacred Vel of Murugan__vel,weapon,divine.jpg
peacock__Divine Peacock Vahana__peacock,vahana,bird.jpg
six-faces__Six Faces of Murugan__shadanan,faces,deity.jpg
```

#### ⚠️ Acceptable (Will Still Work)
```
murugan_temple.jpg          → Title: "murugan temple", Tags: ["murugan", "temple"]
lord-murugan-1.png          → Title: "lord murugan 1", Tags: ["lord", "murugan", "1"]
IMG_001.jpg                 → Title: "IMG 001", Tags: ["img", "001"]
```

#### ❌ Avoid
- Special characters: `@#$%^&*()`
- Spaces in filenames (use `-` or `_`)
- Very long filenames (keep under 100 chars)

---

## 🎯 What the Script Does

1. **Scans Directory** - Finds all `.jpg`, `.jpeg`, `.png`, `.webp` files
2. **Parses Metadata** - Extracts title and tags from filename
3. **Generates Variants:**
   - Original (full resolution)
   - Web (1280px max, 85% quality)
   - Thumbnail (640px, 75% quality)
4. **Uploads to Storage:**
   - `images/original/YYYYMMDD/uuid_slug.jpg`
   - `images/web/YYYYMMDD/uuid_web.jpg`
   - `images/thumb/YYYYMMDD/uuid_thumb.jpg`
5. **Saves to Database** - Creates entry in `media` table with metadata

---

## 📊 Upload Output

```
🚀 Murugan Wallpapers Bulk Upload Script

📂 Scanning directory: /path/to/assets-to-upload

📸 Found 5 image(s)

  📁 Processing: palani-temple__Palani Murugan Temple__temple,murugan.jpg
    ⬆️  Uploading original...
    🖼️  Creating web version (1280px)...
    🖼️  Creating thumbnail (640px)...
    💾 Saving to database...
    ✅ Success! ID: 123e4567-e89b-12d3-a456-426614174000

  📁 Processing: vel-murugan__Sacred Vel__vel,weapon,divine.jpg
    ⬆️  Uploading original...
    🖼️  Creating web version (1280px)...
    🖼️  Creating thumbnail (640px)...
    💾 Saving to database...
    ✅ Success! ID: 987fcdeb-51a2-43f1-b456-987654321000

═════════════════════════════════════════════════════════════
✨ Upload Complete!

   ✅ Successful: 5
   ❌ Failed: 0
   📊 Total: 5

🎉 Your media is now available in the app!
   View at: https://your-project.supabase.co/storage/v1/object/public/public-media/
```

---

## 🔧 Configuration Options

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | ✅ Yes | Your Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_KEY` | ✅ Yes | Service role key | `eyJhbGc...` |
| `LOCAL_DIR` | ❌ No | Local directory to scan | `./my-images` (default: `../assets-to-upload`) |

### Script Options

You can modify the script to customize:

```javascript
// Image quality
const webBuf = await sharp(buffer)
  .resize({ width: 1280, withoutEnlargement: true })
  .jpeg({ quality: 85 });  // Change quality here (1-100)

// Thumbnail size
const thumbBuf = await sharp(buffer)
  .resize({ width: 640, height: 640 })  // Change size here
  .jpeg({ quality: 75 });

// Storage paths
const bucketOrg = `images/original/${datePrefix}/${unique}_${slug}.jpg`;
// Customize folder structure here
```

---

## 📝 Metadata Extraction

The script automatically extracts metadata:

### From Filename
```javascript
// Input: "palani-temple__Palani Murugan Temple__temple,murugan,devotional.jpg"

{
  title: "Palani Murugan Temple",
  tags: ["temple", "murugan", "devotional"]
}
```

### From Image
```javascript
{
  original_width: 3840,
  original_height: 2160,
  format: "jpeg",
  uploaded_from: "bulk-upload-script"
}
```

### Stored in Database
All metadata is saved in the `media` table:
```sql
{
  "kind": "image",
  "title": "Palani Murugan Temple",
  "description": "High quality Murugan devotional wallpaper - Palani Murugan Temple",
  "tags": ["temple", "murugan", "devotional"],
  "metadata": {
    "uploaded_from": "bulk-upload-script",
    "original_width": 3840,
    "original_height": 2160,
    "format": "jpeg"
  }
}
```

---

## 🐛 Troubleshooting

### Error: "SUPABASE_URL not set"
**Solution:** Set environment variables or create `.env` file

### Error: "Bucket not found"
**Solution:** Create `public-media` bucket in Supabase Dashboard → Storage

### Error: "Permission denied"
**Solution:** Use service role key (not anon key)

### Error: "Sharp installation failed"
**Solution:** 
```bash
npm install sharp --force
# or
npm install --platform=darwin --arch=x64 sharp  # For Mac
```

### Error: "File already exists"
**Solution:** Script uses unique IDs, but if error persists:
- Delete old files from storage
- Or modify script to set `upsert: true`

### Images are too large
**Solution:** Adjust quality settings in script:
```javascript
.jpeg({ quality: 70 })  // Lower = smaller file size
```

### Upload is slow
**Solution:**
- Upload smaller batches
- Check internet connection
- Consider running on server close to Supabase region

---

## 📦 Dependencies

```json
{
  "@supabase/supabase-js": "^2.39.0",  // Supabase client
  "sharp": "^0.33.0",                   // Image processing
  "fast-glob": "^3.3.2"                 // Fast file scanning
}
```

### Why These Libraries?

- **@supabase/supabase-js** - Official Supabase client for database and storage
- **sharp** - Fast, high-quality image processing (used by Vercel, Netlify)
- **fast-glob** - Extremely fast file system searching

---

## 🎯 Advanced Usage

### Upload from Multiple Directories
```bash
# Upload from different folders
LOCAL_DIR=./wallpapers npm run upload
LOCAL_DIR=./devotional-art npm run upload
LOCAL_DIR=./temple-photos npm run upload
```

### Custom Tags
Add default tags for all images in a batch:
```javascript
// Modify script
const defaultTags = ['murugan', 'devotional', 'wallpaper'];
const tags = [...defaultTags, ...parsedTags];
```

### Batch Processing
```bash
# Upload in batches of 10
for dir in batch-*; do
  LOCAL_DIR=$dir npm run upload
  sleep 5  # Wait between batches
done
```

### Dry Run (Test Without Uploading)
```javascript
// Add to script
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!DRY_RUN) {
  await uploadBuffer(bucketOrg, buffer);
} else {
  console.log('  [DRY RUN] Would upload:', bucketOrg);
}
```

---

## 📊 Storage Organization

After upload, your storage will be organized:

```
public-media/
├── images/
│   ├── original/
│   │   └── 20241112/
│   │       ├── abc123def456_palani-temple.jpg
│   │       ├── def456ghi789_vel-murugan.jpg
│   │       └── ghi789jkl012_peacock-vahana.jpg
│   ├── web/
│   │   └── 20241112/
│   │       ├── abc123def456_web.jpg
│   │       ├── def456ghi789_web.jpg
│   │       └── ghi789jkl012_web.jpg
│   └── thumb/
│       └── 20241112/
│           ├── abc123def456_thumb.jpg
│           ├── def456ghi789_thumb.jpg
│           └── ghi789jkl012_thumb.jpg
```

---

## ✅ Best Practices

1. **Name files descriptively** - Use the slug__title__tags format
2. **Use high-quality sources** - Original images should be high resolution
3. **Add relevant tags** - Helps with search and discovery
4. **Test with small batches** - Upload 5-10 images first
5. **Backup originals** - Keep a copy of original files
6. **Monitor storage usage** - Check Supabase Dashboard → Usage
7. **Clean up failed uploads** - Remove partial uploads if script fails

---

## 📚 Related Documentation

- **Architecture:** `/ARCHITECTURE.md`
- **Setup Guide:** `/SETUP_COMPLETE.md`
- **Deployment:** `/DEPLOY.md`
- **Database Schema:** `/supabase/migrations/001_initial_schema.sql`

---

**🙏 Happy uploading! May Lord Murugan bless your media library!**
