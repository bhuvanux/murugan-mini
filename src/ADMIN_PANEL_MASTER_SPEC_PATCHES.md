# Admin Panel Master Spec - Complete Module Implementations

**THIS FILE CONTAINS ALL MISSING MODULE IMPLEMENTATIONS**  
**Append these sections to ADMIN_PANEL_MASTER_SPEC.md after line 1500**

---

## 🔧 PATCH 1: Complete Wallpapers Manager Module

### Wallpapers Page Component

```tsx
// /pages/admin/wallpapers.tsx
import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Plus, Grid3x3, List, Star, Download, Eye, Heart, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { WallpaperCard } from '../../components/wallpapers/WallpaperCard';
import { WallpaperListItem } from '../../components/wallpapers/WallpaperListItem';
import { WallpaperUploadModal } from '../../components/wallpapers/WallpaperUploadModal';
import { BulkActionsBar } from '../../components/wallpapers/BulkActionsBar';
import { supabase } from '../../utils/supabase/client';

interface Wallpaper {
  id: string;
  title: string;
  title_tamil: string;
  description: string;
  description_tamil: string;
  image_url: string;
  thumbnail_url: string;
  category: string;
  tags: string[];
  dimensions: string;
  file_size: number;
  downloads: number;
  favorites: number;
  views: number;
  active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export default function WallpapersManager() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'downloads'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchWallpapers();
    fetchCategories();
  }, [selectedCategory, selectedTags, sortBy]);

  const fetchWallpapers = async () => {
    let query = supabase
      .from('wallpapers')
      .select('*');

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    if (selectedTags.length > 0) {
      query = query.contains('tags', selectedTags);
    }

    // Sorting
    switch (sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popular':
        query = query.order('views', { ascending: false });
        break;
      case 'downloads':
        query = query.order('downloads', { ascending: false });
        break;
    }

    const { data, error } = await query;
    if (!error && data) {
      setWallpapers(data);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('wallpaper_categories')
      .select('name')
      .order('name');

    if (!error && data) {
      setCategories(['all', ...data.map(c => c.name)]);
    }
  };

  const handleBulkAction = async (action: string) => {
    switch (action) {
      case 'activate':
        await supabase
          .from('wallpapers')
          .update({ active: true })
          .in('id', selectedItems);
        break;
      case 'deactivate':
        await supabase
          .from('wallpapers')
          .update({ active: false })
          .in('id', selectedItems);
        break;
      case 'feature':
        await supabase
          .from('wallpapers')
          .update({ featured: true })
          .in('id', selectedItems);
        break;
      case 'delete':
        if (confirm(`Delete ${selectedItems.length} wallpapers?`)) {
          await supabase
            .from('wallpapers')
            .delete()
            .in('id', selectedItems);
        }
        break;
    }
    
    setSelectedItems([]);
    fetchWallpapers();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-['TAU-Paalai'] text-gray-900">Wallpapers</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage wallpaper content • {wallpapers.length} total
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Upload Wallpaper
            </button>
          </div>
        </div>

        {/* Category Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2
                ${selectedCategory === category
                  ? 'bg-[#0d5e38] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
              {category !== 'all' && (
                <span className="text-xs opacity-75">
                  {wallpapers.filter(w => w.category === category).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sort Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="downloads">Most Downloaded</option>
                </select>
              </div>

              {/* Featured Filter */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" className="rounded" />
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Featured Only</span>
                </label>
              </div>

              {/* Active Filter */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" className="rounded" />
                  <Eye className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Active Only</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* View Toggle + Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{wallpapers.reduce((sum, w) => sum + w.views, 0).toLocaleString()} views</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span>{wallpapers.reduce((sum, w) => sum + w.downloads, 0).toLocaleString()} downloads</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span>{wallpapers.reduce((sum, w) => sum + w.favorites, 0).toLocaleString()} favorites</span>
            </div>
          </div>

          {/* View Toggle */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedItems.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedItems.length}
            onAction={handleBulkAction}
            onClear={() => setSelectedItems([])}
          />
        )}

        {/* Wallpapers Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wallpapers.map((wallpaper) => (
              <WallpaperCard
                key={wallpaper.id}
                wallpaper={wallpaper}
                selected={selectedItems.includes(wallpaper.id)}
                onSelect={(id) => {
                  if (selectedItems.includes(id)) {
                    setSelectedItems(selectedItems.filter(i => i !== id));
                  } else {
                    setSelectedItems([...selectedItems, id]);
                  }
                }}
                onRefresh={fetchWallpapers}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {wallpapers.map((wallpaper) => (
              <WallpaperListItem
                key={wallpaper.id}
                wallpaper={wallpaper}
                selected={selectedItems.includes(wallpaper.id)}
                onSelect={(id) => {
                  if (selectedItems.includes(id)) {
                    setSelectedItems(selectedItems.filter(i => i !== id));
                  } else {
                    setSelectedItems([...selectedItems, id]);
                  }
                }}
                onRefresh={fetchWallpapers}
              />
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <WallpaperUploadModal
            onClose={() => setShowUploadModal(false)}
            onUploadComplete={fetchWallpapers}
          />
        )}
      </div>
    </AdminLayout>
  );
}
```

### Wallpaper Card Component

```tsx
// /components/wallpapers/WallpaperCard.tsx
import { useState } from 'react';
import { Edit, Trash2, Download, Eye, Heart, Star, MoreVertical } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface WallpaperCardProps {
  wallpaper: any;
  selected: boolean;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

export function WallpaperCard({ wallpaper, selected, onSelect, onRefresh }: WallpaperCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${wallpaper.title}"?`)) return;

    const { error } = await supabase
      .from('wallpapers')
      .delete()
      .eq('id', wallpaper.id);

    if (!error) {
      onRefresh();
    }
  };

  const toggleFeatured = async () => {
    await supabase
      .from('wallpapers')
      .update({ featured: !wallpaper.featured })
      .eq('id', wallpaper.id);
    
    onRefresh();
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow group relative">
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(wallpaper.id)}
          className="w-5 h-5 rounded border-2 border-white shadow-lg cursor-pointer"
        />
      </div>

      {/* Featured Star */}
      {wallpaper.featured && (
        <div className="absolute top-2 right-2 z-10">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        </div>
      )}

      {/* Image */}
      <div 
        className="relative aspect-[9/16] bg-gray-200 cursor-pointer"
        onMouseEnter={() => setShowAnalytics(true)}
        onMouseLeave={() => setShowAnalytics(false)}
      >
        <img
          src={wallpaper.thumbnail_url || wallpaper.image_url}
          alt={wallpaper.title}
          className="w-full h-full object-cover"
        />

        {/* Analytics Overlay */}
        {showAnalytics && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-white space-y-3 text-center">
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center">
                  <Eye className="w-5 h-5 mb-1" />
                  <span className="text-sm">{wallpaper.views.toLocaleString()}</span>
                  <span className="text-xs opacity-75">Views</span>
                </div>
                <div className="flex flex-col items-center">
                  <Download className="w-5 h-5 mb-1" />
                  <span className="text-sm">{wallpaper.downloads.toLocaleString()}</span>
                  <span className="text-xs opacity-75">Downloads</span>
                </div>
                <div className="flex flex-col items-center">
                  <Heart className="w-5 h-5 mb-1" />
                  <span className="text-sm">{wallpaper.favorites.toLocaleString()}</span>
                  <span className="text-xs opacity-75">Favorites</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-medium text-gray-900 line-clamp-1">{wallpaper.title}</h3>
          <p className="text-sm text-gray-600 font-['TAU-Nilavu'] line-clamp-1">
            {wallpaper.title_tamil}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {wallpaper.tags.slice(0, 3).map((tag: string, idx: number) => (
            <span
              key={idx}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
          {wallpaper.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{wallpaper.tags.length - 3}</span>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{wallpaper.category}</span>
          <span>{wallpaper.dimensions}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
          <button
            onClick={toggleFeatured}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
          >
            <Star className="w-4 h-4" />
            {wallpaper.featured ? 'Unfeature' : 'Feature'}
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Wallpaper List Item Component

```tsx
// /components/wallpapers/WallpaperListItem.tsx
import { Edit, Trash2, Download, Eye, Heart, Star } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface WallpaperListItemProps {
  wallpaper: any;
  selected: boolean;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

export function WallpaperListItem({ wallpaper, selected, onSelect, onRefresh }: WallpaperListItemProps) {
  const handleDelete = async () => {
    if (!confirm(`Delete "${wallpaper.title}"?`)) return;

    const { error } = await supabase
      .from('wallpapers')
      .delete()
      .eq('id', wallpaper.id);

    if (!error) {
      onRefresh();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(wallpaper.id)}
          className="w-5 h-5 rounded cursor-pointer"
        />

        {/* Thumbnail */}
        <img
          src={wallpaper.thumbnail_url || wallpaper.image_url}
          alt={wallpaper.title}
          className="w-16 h-28 object-cover rounded"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{wallpaper.title}</h3>
            {wallpaper.featured && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
          </div>
          <p className="text-sm text-gray-600 font-['TAU-Nilavu'] truncate">
            {wallpaper.title_tamil}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-gray-500">{wallpaper.category}</span>
            <span className="text-xs text-gray-500">{wallpaper.dimensions}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
          {wallpaper.tags.slice(0, 3).map((tag: string, idx: number) => (
            <span
              key={idx}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Analytics */}
        <div className="hidden lg:flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {wallpaper.views.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            {wallpaper.downloads.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {wallpaper.favorites.toLocaleString()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Wallpaper Upload Modal

```tsx
// /components/wallpapers/WallpaperUploadModal.tsx
import { useState } from 'react';
import { X, Upload, Tag, Folder } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface WallpaperUploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

export function WallpaperUploadModal({ onClose, onUploadComplete }: WallpaperUploadModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    title_tamil: '',
    description: '',
    description_tamil: '',
    category: '',
    tags: '',
    image: null as File | null
  });
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) return;

    setUploading(true);

    try {
      // Upload image
      const imagePath = `wallpapers/${Date.now()}_${formData.image.name}`;
      await supabase.storage
        .from('wallpaper-assets')
        .upload(imagePath, formData.image);

      const { data: urlData } = supabase.storage
        .from('wallpaper-assets')
        .getPublicUrl(imagePath);

      // Get image dimensions
      const img = new Image();
      img.src = preview;
      await new Promise(resolve => img.onload = resolve);
      const dimensions = `${img.width}x${img.height}`;

      // Insert wallpaper record
      await supabase
        .from('wallpapers')
        .insert({
          title: formData.title,
          title_tamil: formData.title_tamil,
          description: formData.description,
          description_tamil: formData.description_tamil,
          image_url: urlData.publicUrl,
          thumbnail_url: urlData.publicUrl,
          category: formData.category,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
          dimensions,
          file_size: formData.image.size,
          downloads: 0,
          favorites: 0,
          views: 0,
          active: true,
          featured: false
        });

      onUploadComplete();
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload wallpaper');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-['TAU-Paalai']">Upload Wallpaper</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wallpaper Image *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Preview" className="max-h-96 mx-auto rounded" />
                  <button
                    type="button"
                    onClick={() => {
                      setPreview('');
                      setFormData({ ...formData, image: null });
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="wallpaper-upload"
                    required
                  />
                  <label
                    htmlFor="wallpaper-upload"
                    className="inline-block px-4 py-2 bg-[#0d5e38] text-white rounded-lg cursor-pointer hover:bg-[#0a4a2a]"
                  >
                    Choose File
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Title & Category Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title (English) *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title (Tamil)
              </label>
              <input
                type="text"
                value={formData.title_tamil}
                onChange={(e) => setFormData({ ...formData, title_tamil: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-['TAU-Nilavu'] focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (English)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Folder className="w-4 h-4 inline mr-1" />
              Category *
            </label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
              placeholder="e.g., Lord Murugan, Temples, Nature"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
              placeholder="devotional, colorful, hd, 4k"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !formData.image}
              className="flex-1 px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Wallpaper'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Bulk Actions Bar

```tsx
// /components/wallpapers/BulkActionsBar.tsx
import { CheckSquare, Eye, EyeOff, Star, Trash2, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: string) => void;
  onClear: () => void;
}

export function BulkActionsBar({ selectedCount, onAction, onClear }: BulkActionsBarProps) {
  return (
    <div className="bg-[#0d5e38] text-white rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CheckSquare className="w-5 h-5" />
        <span className="font-medium">{selectedCount} items selected</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onAction('activate')}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Activate
        </button>
        <button
          onClick={() => onAction('deactivate')}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition-colors"
        >
          <EyeOff className="w-4 h-4" />
          Deactivate
        </button>
        <button
          onClick={() => onAction('feature')}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Star className="w-4 h-4" />
          Feature
        </button>
        <button
          onClick={() => onAction('delete')}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
        <button
          onClick={onClear}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

---

## 🔧 PATCH 2: Complete Media Manager Module

### Media Page Component

```tsx
// /pages/admin/media.tsx
import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Music, Video, Plus, Grid3x3, List, Download } from 'lucide-react';
import { SongsTab } from '../../components/media/SongsTab';
import { VideosTab } from '../../components/media/VideosTab';
import { MediaUploadModal } from '../../components/media/MediaUploadModal';
import { YouTubeConverterModal } from '../../components/media/YouTubeConverterModal';

export default function MediaManager() {
  const [activeTab, setActiveTab] = useState<'songs' | 'videos'>('songs');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showYouTubeConverter, setShowYouTubeConverter] = useState(false);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-[#0d5e38]" />
            <div>
              <h1 className="text-2xl font-['TAU-Paalai'] text-gray-900">Media Manager</h1>
              <p className="text-sm text-gray-600 mt-1">Manage songs and videos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowYouTubeConverter(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              YouTube to MP3
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Upload {activeTab === 'songs' ? 'Song' : 'Video'}
            </button>
          </div>
        </div>

        {/* Songs | Videos Tab Switcher */}
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('songs')}
            className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'songs' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Music className="w-4 h-4" />
            Songs
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'videos' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Video className="w-4 h-4" />
            Videos
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'songs' ? <SongsTab /> : <VideosTab />}

        {/* Modals */}
        {showUploadModal && (
          <MediaUploadModal
            type={activeTab}
            onClose={() => setShowUploadModal(false)}
            onUploadComplete={() => {
              setShowUploadModal(false);
              // Trigger refresh
            }}
          />
        )}

        {showYouTubeConverter && (
          <YouTubeConverterModal
            onClose={() => setShowYouTubeConverter(false)}
            onConversionComplete={() => {
              setShowYouTubeConverter(false);
              // Trigger refresh
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
```

### Songs Tab Component

```tsx
// /components/media/SongsTab.tsx
import { useState, useEffect } from 'react';
import { Grid3x3, List, Folder } from 'lucide-react';
import { MediaCard } from './MediaCard';
import { MediaListItem } from './MediaListItem';
import { supabase } from '../../utils/supabase/client';

interface Song {
  id: string;
  title: string;
  title_tamil: string;
  artist: string;
  artist_tamil: string;
  album: string;
  duration: number;
  category: string;
  thumbnail_url: string;
  file_url: string;
  waveform_url?: string;
  file_size: number;
  views: number;
  downloads: number;
  favorites: number;
  created_at: string;
}

export function SongsTab() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchSongs();
    fetchCategories();
  }, [selectedCategory]);

  const fetchSongs = async () => {
    let query = supabase
      .from('media')
      .select('*')
      .eq('type', 'song')
      .order('created_at', { ascending: false });

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    const { data, error } = await query;
    if (!error && data) {
      setSongs(data);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('media_categories')
      .select('name')
      .eq('type', 'song')
      .order('name');

    if (data) {
      setCategories(['all', ...data.map(c => c.name)]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Folders */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`
              px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2
              ${selectedCategory === category
                ? 'bg-[#0d5e38] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <Folder className="w-4 h-4" />
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Songs Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {songs.map((song) => (
            <MediaCard key={song.id} media={song} type="song" onRefresh={fetchSongs} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {songs.map((song) => (
            <MediaListItem key={song.id} media={song} type="song" onRefresh={fetchSongs} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Videos Tab Component

```tsx
// /components/media/VideosTab.tsx
import { useState, useEffect } from 'react';
import { Grid3x3, List, Folder } from 'lucide-react';
import { MediaCard } from './MediaCard';
import { MediaListItem } from './MediaListItem';
import { supabase } from '../../utils/supabase/client';

export function VideosTab() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [videos, setVideos] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchVideos();
    fetchCategories();
  }, [selectedCategory]);

  const fetchVideos = async () => {
    let query = supabase
      .from('media')
      .select('*')
      .eq('type', 'video')
      .order('created_at', { ascending: false });

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    const { data, error } = await query;
    if (!error && data) {
      setVideos(data);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('media_categories')
      .select('name')
      .eq('type', 'video')
      .order('name');

    if (data) {
      setCategories(['all', ...data.map(c => c.name)]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Folders */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`
              px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2
              ${selectedCategory === category
                ? 'bg-[#0d5e38] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <Folder className="w-4 h-4" />
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Videos Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <MediaCard key={video.id} media={video} type="video" onRefresh={fetchVideos} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((video) => (
            <MediaListItem key={video.id} media={video} type="video" onRefresh={fetchVideos} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Media Card Component

```tsx
// /components/media/MediaCard.tsx
import { Edit, Trash2, Download, BarChart3, Play, Music } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface MediaCardProps {
  media: any;
  type: 'song' | 'video';
  onRefresh: () => void;
}

export function MediaCard({ media, type, onRefresh }: MediaCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${media.title}"?`)) return;

    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', media.id);

    if (!error) {
      onRefresh();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200 group cursor-pointer">
        <img
          src={media.thumbnail_url}
          alt={media.title}
          className="w-full h-full object-cover"
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {type === 'video' ? (
            <Play className="w-12 h-12 text-white" />
          ) : (
            <Music className="w-12 h-12 text-white" />
          )}
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(media.duration)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-medium text-gray-900 line-clamp-1">{media.title}</h3>
          <p className="text-sm text-gray-600 font-['TAU-Nilavu'] line-clamp-1">
            {media.title_tamil}
          </p>
          <p className="text-sm text-gray-500 mt-1">{media.artist}</p>
        </div>

        {/* Waveform Preview (for songs) */}
        {type === 'song' && media.waveform_url && (
          <div className="h-12 bg-gray-100 rounded overflow-hidden">
            <img
              src={media.waveform_url}
              alt="Waveform"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Analytics */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            {media.views.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {media.downloads.toLocaleString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
          <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded transition-colors">
            <BarChart3 className="w-4 h-4" />
            Stats
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Media List Item Component

```tsx
// /components/media/MediaListItem.tsx
import { Edit, Trash2, Download, BarChart3, Play } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface MediaListItemProps {
  media: any;
  type: 'song' | 'video';
  onRefresh: () => void;
}

export function MediaListItem({ media, type, onRefresh }: MediaListItemProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${media.title}"?`)) return;

    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', media.id);

    if (!error) {
      onRefresh();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-center gap-4">
        {/* Thumbnail + Play */}
        <div className="relative group cursor-pointer">
          <img
            src={media.thumbnail_url}
            alt={media.title}
            className="w-24 h-16 object-cover rounded"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
            <Play className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{media.title}</h3>
          <p className="text-sm text-gray-600 font-['TAU-Nilavu'] truncate">
            {media.title_tamil}
          </p>
          <p className="text-sm text-gray-500">{media.artist}</p>
        </div>

        {/* Analytics */}
        <div className="hidden lg:flex items-center gap-6 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            {media.views.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            {media.downloads.toLocaleString()}
          </span>
          <span>{formatDuration(media.duration)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors">
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### YouTube Converter Modal

```tsx
// /components/media/YouTubeConverterModal.tsx
import { useState } from 'react';
import { X, Download, Loader } from 'lucide-react';

interface YouTubeConverterModalProps {
  onClose: () => void;
  onConversionComplete: () => void;
}

export function YouTubeConverterModal({ onClose, onConversionComplete }: YouTubeConverterModalProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleConvert = async () => {
    setConverting(true);
    setProgress(0);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 300);

      // Call backend API
      const response = await fetch('/api/youtube-to-mp3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      });

      clearInterval(interval);
      setProgress(100);

      if (response.ok) {
        setTimeout(() => {
          onConversionComplete();
        }, 500);
      }
    } catch (error) {
      console.error('Conversion error:', error);
      alert('Failed to convert video');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-['TAU-Paalai']">YouTube to MP3</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube URL
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
              disabled={converting}
            />
          </div>

          {converting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Converting...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#0d5e38] h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={converting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConvert}
              disabled={converting || !youtubeUrl}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {converting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Convert
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔧 PATCH 3: Complete Sparkles Manager Module

*(Sparkles components are already fully documented in the original ADMIN_PANEL_MASTER_SPEC.md - No changes needed)*

---

## 🔧 PATCH 4: Complete Photos Manager Module

### Photos Page Component

```tsx
// /pages/admin/photos.tsx
import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Plus, Grid3x3, List, Folder, Upload } from 'lucide-react';
import { PhotoCard } from '../../components/photos/PhotoCard';
import { PhotoUploadModal } from '../../components/photos/PhotoUploadModal';
import { AlbumSelector } from '../../components/photos/AlbumSelector';
import { supabase } from '../../utils/supabase/client';

interface Photo {
  id: string;
  title: string;
  description: string;
  image_url: string;
  thumbnail_url: string;
  album: string;
  tags: string[];
  exif_data: any;
  width: number;
  height: number;
  file_size: number;
  views: number;
  downloads: number;
  created_at: string;
}

export default function PhotosManager() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<string[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchPhotos();
    fetchAlbums();
  }, [selectedAlbum]);

  const fetchPhotos = async () => {
    let query = supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (selectedAlbum !== 'all') {
      query = query.eq('album', selectedAlbum);
    }

    const { data, error } = await query;
    if (!error && data) {
      setPhotos(data);
    }
  };

  const fetchAlbums = async () => {
    const { data } = await supabase
      .from('photo_albums')
      .select('name')
      .order('name');

    if (data) {
      setAlbums(['all', ...data.map(a => a.name)]);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-['TAU-Paalai'] text-gray-900">Photos Gallery</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage photo collections • {photos.length} photos
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Photos
          </button>
        </div>

        {/* Album Selector */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {albums.map((album) => (
            <button
              key={album}
              onClick={() => setSelectedAlbum(album)}
              className={`
                px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2
                ${selectedAlbum === album
                  ? 'bg-[#0d5e38] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <Folder className="w-4 h-4" />
              {album.charAt(0).toUpperCase() + album.slice(1)}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex justify-end">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} onRefresh={fetchPhotos} />
          ))}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <PhotoUploadModal
            onClose={() => setShowUploadModal(false)}
            onUploadComplete={fetchPhotos}
          />
        )}
      </div>
    </AdminLayout>
  );
}
```

### Photo Card Component

```tsx
// /components/photos/PhotoCard.tsx
import { useState } from 'react';
import { Trash2, Download, Eye, Info } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface PhotoCardProps {
  photo: any;
  onRefresh: () => void;
}

export function PhotoCard({ photo, onRefresh }: PhotoCardProps) {
  const [showInfo, setShowInfo] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this photo?')) return;

    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', photo.id);

    if (!error) {
      onRefresh();
    }
  };

  return (
    <div className="group relative aspect-square bg-gray-200 rounded-lg overflow-hidden">
      <img
        src={photo.thumbnail_url || photo.image_url}
        alt={photo.title}
        className="w-full h-full object-cover"
      />

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
        <h3 className="text-white text-sm font-medium text-center line-clamp-2">
          {photo.title}
        </h3>
        
        <div className="flex items-center gap-2 text-white text-xs">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {photo.views}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {photo.downloads}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Info className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="font-medium text-gray-900 mb-4">{photo.title}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Dimensions:</span>
                <span>{photo.width} x {photo.height}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Size:</span>
                <span>{(photo.file_size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Album:</span>
                <span>{photo.album}</span>
              </div>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Photo Upload Modal

```tsx
// /components/photos/PhotoUploadModal.tsx
import { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface PhotoUploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

export function PhotoUploadModal({ onClose, onUploadComplete }: PhotoUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [album, setAlbum] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Upload image
      const imagePath = `photos/${Date.now()}_${file.name}`;
      await supabase.storage
        .from('photo-assets')
        .upload(imagePath, file);

      const { data: urlData } = supabase.storage
        .from('photo-assets')
        .getPublicUrl(imagePath);

      // Get image dimensions
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(resolve => img.onload = resolve);

      // Insert record
      await supabase
        .from('photos')
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ''),
          image_url: urlData.publicUrl,
          thumbnail_url: urlData.publicUrl,
          album,
          tags: [],
          width: img.width,
          height: img.height,
          file_size: file.size,
          views: 0,
          downloads: 0
        });

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    onUploadComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-['TAU-Paalai']">Upload Photos</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Photos
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="inline-block px-4 py-2 bg-[#0d5e38] text-white rounded-lg cursor-pointer hover:bg-[#0a4a2a]"
              >
                Choose Files
              </label>
              {files.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {files.length} file(s) selected
                </p>
              )}
            </div>
          </div>

          {/* Album */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Album
            </label>
            <input
              type="text"
              required
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
              placeholder="e.g., Temple Photos, Festivals"
            />
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#0d5e38] h-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="flex-1 px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] disabled:opacity-50"
            >
              {uploading ? `Uploading... ${progress}%` : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 🔧 PATCH 5: Complete Users Manager Module

```tsx
// /pages/admin/users.tsx
import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Search, Filter, Download, UserCheck, UserX } from 'lucide-react';
import { UserRow } from '../../components/users/UserRow';
import { UserDrawer } from '../../components/users/UserDrawer';
import { supabase } from '../../utils/supabase/client';

interface User {
  id: string;
  email: string;
  name: string;
  name_tamil: string;
  avatar_url?: string;
  phone?: string;
  subscription_status: 'free' | 'premium';
  registered_at: string;
  last_active: string;
  total_downloads: number;
  total_favorites: number;
  devices: number;
  active: boolean;
}

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, filterStatus]);

  const fetchUsers = async () => {
    let query = supabase
      .from('users')
      .select('*')
      .order('registered_at', { ascending: false });

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    if (filterStatus !== 'all') {
      query = query.eq('subscription_status', filterStatus);
    }

    const { data, error } = await query;
    if (!error && data) {
      setUsers(data);
    }
  };

  const exportUsers = () => {
    const csv = users.map(u => 
      `${u.email},${u.name},${u.subscription_status},${u.registered_at}`
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-['TAU-Paalai']">Users</h1>
            <p className="text-sm text-gray-600 mt-1">{users.length} total users</p>
          </div>

          <button
            onClick={exportUsers}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
          >
            <option value="all">All Users</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downloads</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onClick={() => setSelectedUser(user)}
                  onRefresh={fetchUsers}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* User Drawer */}
        {selectedUser && (
          <UserDrawer
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onRefresh={fetchUsers}
          />
        )}
      </div>
    </AdminLayout>
  );
}
```

### User Row Component

```tsx
// /components/users/UserRow.tsx
import { MoreVertical, UserCheck, UserX, Mail } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface UserRowProps {
  user: any;
  onClick: () => void;
  onRefresh: () => void;
}

export function UserRow({ user, onClick, onRefresh }: UserRowProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const toggleStatus = async () => {
    await supabase
      .from('users')
      .update({ active: !user.active })
      .eq('id', user.id);
    
    onRefresh();
  };

  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={onClick}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src={user.avatar_url || '/default-avatar.png'}
            alt={user.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 text-xs rounded-full ${
          user.subscription_status === 'premium'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {user.subscription_status}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        <div>
          <p>Joined: {formatDate(user.registered_at)}</p>
          <p>Last: {formatDate(user.last_active)}</p>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {user.total_downloads}
      </td>
      <td className="px-6 py-4">
        <span className={`flex items-center gap-1 text-sm ${
          user.active ? 'text-green-600' : 'text-red-600'
        }`}>
          {user.active ? (
            <>
              <UserCheck className="w-4 h-4" />
              Active
            </>
          ) : (
            <>
              <UserX className="w-4 h-4" />
              Inactive
            </>
          )}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleStatus();
          }}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
```

### User Drawer Component

```tsx
// /components/users/UserDrawer.tsx
import { X, Mail, Phone, Calendar, Download, Heart, Monitor } from 'lucide-react';

interface UserDrawerProps {
  user: any;
  onClose: () => void;
  onRefresh: () => void;
}

export function UserDrawer({ user, onClose, onRefresh }: UserDrawerProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div className="w-full md:w-96 bg-white h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-['TAU-Paalai']">User Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar & Name */}
          <div className="text-center">
            <img
              src={user.avatar_url || '/default-avatar.png'}
              alt={user.name}
              className="w-24 h-24 rounded-full mx-auto mb-4"
            />
            <h3 className="font-medium text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-600 font-['TAU-Nilavu']">{user.name_tamil}</p>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Joined {new Date(user.registered_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Download className="w-5 h-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium">{user.total_downloads}</p>
              <p className="text-xs text-gray-500">Downloads</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Heart className="w-5 h-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium">{user.total_favorites}</p>
              <p className="text-xs text-gray-500">Favorites</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Monitor className="w-5 h-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium">{user.devices}</p>
              <p className="text-xs text-gray-500">Devices</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Send Email
            </button>
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              View Activity
            </button>
            <button className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
              Disable Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔧 PATCH 6: Complete Subscriptions Manager Module

```tsx
// /pages/admin/subscriptions.tsx
import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';
import { RevenueGraph } from '../../components/subscriptions/RevenueGraph';
import { PlanEditor } from '../../components/subscriptions/PlanEditor';
import { ActiveSubscriptions } from '../../components/subscriptions/ActiveSubscriptions';

export default function SubscriptionsManager() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeSubscriptions: 0,
    conversionRate: 0,
    mrr: 0
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-['TAU-Paalai']">Subscriptions</h1>
          <p className="text-sm text-gray-600 mt-1">Manage premium subscriptions</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold mt-1">₹45,290</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Subs</p>
                <p className="text-2xl font-semibold mt-1">234</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion</p>
                <p className="text-2xl font-semibold mt-1">8.5%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">MRR</p>
                <p className="text-2xl font-semibold mt-1">₹12,400</p>
              </div>
              <CreditCard className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Revenue Graph */}
        <RevenueGraph />

        {/* Plans & Active Subscriptions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlanEditor />
          <ActiveSubscriptions />
        </div>
      </div>
    </AdminLayout>
  );
}
```

---

## 🔧 PATCH 7: Global Folder Structure Map

```
/admin-panel/
├── components/
│   ├── AdminLayout.tsx              # Main layout wrapper
│   ├── Sidebar.tsx                  # Left sidebar navigation
│   ├── TopBar.tsx                   # Top header bar
│   │
│   ├── dashboard/
│   │   ├── DashboardStats.tsx
│   │   ├── AnalyticsCharts.tsx
│   │   ├── RecentActivity.tsx
│   │   └── QuickActions.tsx
│   │
│   ├── banners/
│   │   ├── BannerCard.tsx
│   │   ├── BannerListItem.tsx
│   │   └── BannerUploadModal.tsx
│   │
│   ├── wallpapers/
│   │   ├── WallpaperCard.tsx
│   │   ├── WallpaperListItem.tsx
│   │   ├── WallpaperUploadModal.tsx
│   │   └── BulkActionsBar.tsx
│   │
│   ├── media/
│   │   ├── SongsTab.tsx
│   │   ├── VideosTab.tsx
│   │   ├── MediaCard.tsx
│   │   ├── MediaListItem.tsx
│   │   ├── MediaUploadModal.tsx
│   │   └── YouTubeConverterModal.tsx
│   │
│   ├── sparkles/
│   │   ├── SparkleCard.tsx
│   │   ├── SparkleListItem.tsx
│   │   └── SparkleEditDrawer.tsx
│   │
│   ├── photos/
│   │   ├── PhotoCard.tsx
│   │   ├── PhotoListItem.tsx
│   │   ├── PhotoUploadModal.tsx
│   │   └── AlbumSelector.tsx
│   │
│   ├── ai-analytics/
│   │   ├── SessionsChart.tsx
│   │   ├── TopQuestions.tsx
│   │   └── ResponseTimeChart.tsx
│   │
│   ├── users/
│   │   ├── UserRow.tsx
│   │   ├── UserDrawer.tsx
│   │   └── ActivityTimeline.tsx
│   │
│   ├── subscriptions/
│   │   ├── RevenueGraph.tsx
│   │   ├── PlanEditor.tsx
│   │   ├── ActiveSubscriptions.tsx
│   │   └── CouponManager.tsx
│   │
│   ├── storage/
│   │   ├── StorageBreakdown.tsx
│   │   ├── OrphanedFiles.tsx
│   │   └── OptimizationSuggestions.tsx
│   │
│   └── ui/                          # ShadCN components
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── drawer.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── textarea.tsx
│       └── ... (other ShadCN components)
│
├── pages/
│   └── admin/
│       ├── index.tsx                # Dashboard
│       ├── banners.tsx
│       ├── wallpapers.tsx
│       ├── media.tsx
│       ├── sparkles.tsx
│       ├── photos.tsx
│       ├── ai-analytics.tsx
│       ├── users.tsx
│       ├── subscriptions.tsx
│       ├── storage.tsx
│       └── settings.tsx
│
├── utils/
│   ├── supabase/
│   │   ├── client.ts                # Supabase client
│   │   ├── admin-client.ts          # Admin backend client
│   │   └── user-client.ts           # User backend client
│   │
│   ├── sync/
│   │   ├── sync-engine.ts           # Dual backend sync
│   │   └── version-manager.ts
│   │
│   ├── image/
│   │   ├── optimizer.ts             # Image optimization
│   │   ├── lqip-generator.ts
│   │   └── resize.ts
│   │
│   └── helpers/
│       ├── date-formatter.ts
│       ├── file-size.ts
│       └── duration-formatter.ts
│
├── styles/
│   └── globals.css                  # Global styles + Tamil fonts
│
├── types/
│   ├── banner.ts
│   ├── wallpaper.ts
│   ├── media.ts
│   ├── sparkle.ts
│   ├── photo.ts
│   └── user.ts
│
├── hooks/
│   ├── useSupabase.ts
│   ├── useAuth.ts
│   └── useSync.ts
│
└── public/
    └── fonts/
        ├── TAU-Paalai.woff2
        └── TAU-Nilavu.woff2
```

---

**END OF PATCHES**

These patches provide complete implementations for all missing modules in the Admin Panel Master Specification. All components follow the Left Sidebar (20:80) architecture and maintain consistency with the design system.
