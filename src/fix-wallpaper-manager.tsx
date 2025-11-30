// This script fixes the syntax error on line 917 of AdminWallpaperManager.tsx
// Run with: deno run --allow-read --allow-write fix-wallpaper-manager.tsx

const filePath = './components/admin/AdminWallpaperManager.tsx';

// Read the file
const content = await Deno.readTextFile(filePath);

// Split into lines
const lines = content.split('\n');

// Fix line 916 (0-indexed, so line 917 is index 916)
if (lines[916].includes('})')){
  // Remove the backslash-n characters
  lines[916] = '      )}';
  console.log('Fixed line 917');
} else {
  console.log('Line 917 content:', lines[916]);
  console.log('No fix needed or line content unexpected');
}

// Write back
await Deno.writeTextFile(filePath, lines.join('\n'));
console.log('File updated successfully');
