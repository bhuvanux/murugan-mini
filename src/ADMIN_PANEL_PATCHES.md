# Murugan Wallpapers & Videos - Admin Panel Patches & Fixes

**Last Updated:** November 25, 2025  
**Project:** Murugan AI Admin Panel  
**Architecture:** Dual Supabase Backend (Admin + User)

This document contains all relevant code, instructions, fixes, patches, and UI update steps for the Murugan AI Admin Panel.

---

## Table of Contents

1. [Header Navigation Fixes](#1-header-navigation-fixes)
2. [Media Manager Fixes](#2-media-manager-fixes)
3. [Sparkle Manager Fixes](#3-sparkle-manager-fixes)
4. [Left Sidebar Layout (20:80)](#4-left-sidebar-layout-2080)
5. [Sidebar Expand/Collapse Feature](#5-sidebar-expandcollapse-feature)
6. [Sync Engine Integration Overview](#6-sync-engine-integration-overview)
7. [Image Optimization Pipeline](#7-image-optimization-pipeline)
8. [AI Chat Logging Architecture](#8-ai-chat-logging-architecture)
9. [Responsive Behavior Rules](#9-responsive-behavior-rules)
10. [Components That Should NOT Change](#10-components-that-should-not-change)

---

## 1. Header Navigation Fixes

### Overview
The header navigation has been converted to a left sidebar (see Section 4), but these rules apply to any top header elements that remain (user avatar, status, etc.).

### Header Spacing & Alignment

```tsx
// Header container
<header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200">
  {/* Logo/Brand - Left side */}
  <div className="flex items-center gap-4">
    <img src="/logo.svg" alt="Logo" className="h-8" />
    <h1 className="font-['TAU-Paalai'] text-xl text-[#0d5e38]">Murugan Admin</h1>
  </div>

  {/* Search Bar - Center (if needed in header) */}
  <div className="flex-1 max-w-xl mx-8">
    <input
      type="text"
      placeholder="Search..."
      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
    />
  </div>

  {/* Right Side - Avatar + Status */}
  <div className="flex items-center gap-4">
    {/* Status Badge */}
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-sm text-gray-700">Online</span>
    </div>

    {/* User Avatar with Dropdown */}
    <div className="relative">
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <img
          src={userAvatar || "/default-avatar.png"}
          alt="User"
          className="w-9 h-9 rounded-full border-2 border-[#0d5e38]"
        />
      </button>

      {/* Dropdown Menu */}
      {showUserMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <a href="#profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Profile Settings
          </a>
          <a href="#logout" className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">
            Sign Out
          </a>
        </div>
      )}
    </div>
  </div>
</header>
```

### Active Menu Underline Rules

**Note:** This is now handled by the sidebar (Section 4), but if tabs are needed:

```tsx
// Active state indicator (3px, rounded, bottom-aligned)
<nav className="flex gap-8">
  {menuItems.map((item) => (
    <button
      key={item.id}
      className={`relative pb-2 text-sm font-medium transition-colors ${
        activeItem === item.id ? 'text-[#0d5e38]' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {item.label}
      {activeItem === item.id && (
        <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0d5e38] rounded-t-full" />
      )}
    </button>
  ))}
</nav>
```

---

## 2. Media Manager Fixes

### Complete Media Manager Component Structure

```tsx
import { useState, useEffect } from 'react';
import { Music, Video, Plus, Grid3x3, List, Edit, Trash2, BarChart3, Download } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface MediaItem {
  id: string;
  title: string;
  title_tamil: string;
  artist: string;
  artist_tamil: string;
  duration: number;
  category: string;
  thumbnail_url: string;
  file_url: string;
  file_size: number;
  views: number;
  downloads: number;
  favorites: number;
  created_at: string;
  type: 'song' | 'video';
}

export function MediaManager() {
  const [activeTab, setActiveTab] = useState<'songs' | 'videos'>('songs');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showYouTubeConverter, setShowYouTubeConverter] = useState(false);

  // Fetch media items
  useEffect(() => {
    fetchMediaItems();
    fetchCategories();
  }, [activeTab, selectedCategory]);

  const fetchMediaItems = async () => {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('type', activeTab === 'songs' ? 'song' : 'video')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMediaItems(data);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('media_categories')
      .select('name')
      .order('name');

    if (!error && data) {
      setCategories(['all', ...data.map(c => c.name)]);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Categories */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Music className="w-6 h-6 text-[#0d5e38]" />
          <h1 className="text-2xl font-['TAU-Paalai']">Media Manager</h1>
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

      {/* Category Folders */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? 'bg-[#0d5e38] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Songs | Videos Tab Switcher */}
      <div className="flex items-center justify-between">
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

        {/* Grid/List Toggle */}
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

      {/* Media Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mediaItems.map((item) => (
            <MediaCard key={item.id} item={item} onRefresh={fetchMediaItems} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {mediaItems.map((item) => (
            <MediaListItem key={item.id} item={item} onRefresh={fetchMediaItems} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showUploadModal && (
        <MediaUploadModal
          type={activeTab}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={fetchMediaItems}
        />
      )}

      {showYouTubeConverter && (
        <YouTubeConverterModal
          onClose={() => setShowYouTubeConverter(false)}
          onConversionComplete={fetchMediaItems}
        />
      )}
    </div>
  );
}

// Media Card Component (Grid View)
function MediaCard({ item, onRefresh }: { item: MediaItem; onRefresh: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200">
        <img
          src={item.thumbnail_url}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(item.duration)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-medium text-gray-900 line-clamp-1">{item.title}</h3>
          <p className="text-sm text-gray-600 font-['TAU-Nilavu'] line-clamp-1">
            {item.title_tamil}
          </p>
          <p className="text-sm text-gray-500 mt-1">{item.artist}</p>
        </div>

        {/* Analytics */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            {item.views.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {item.downloads.toLocaleString()}
          </span>
        </div>

        {/* Horizontal Action Icons */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
          <button
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            onClick={() => handleEdit(item)}
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded transition-colors"
            onClick={() => handleAnalytics(item)}
          >
            <BarChart3 className="w-4 h-4" />
            Stats
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
            onClick={() => handleDelete(item, onRefresh)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Media List Item Component (List View)
function MediaListItem({ item, onRefresh }: { item: MediaItem; onRefresh: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <img
          src={item.thumbnail_url}
          alt={item.title}
          className="w-24 h-16 object-cover rounded"
        />

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-600 font-['TAU-Nilavu']">{item.title_tamil}</p>
          <p className="text-sm text-gray-500">{item.artist}</p>
        </div>

        {/* Analytics */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            {item.views.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            {item.downloads.toLocaleString()}
          </span>
          <span>{formatDuration(item.duration)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            onClick={() => handleEdit(item)}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"
            onClick={() => handleAnalytics(item)}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
            onClick={() => handleDelete(item, onRefresh)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility Functions
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function handleEdit(item: MediaItem) {
  // Open edit modal
  console.log('Edit item:', item.id);
}

function handleAnalytics(item: MediaItem) {
  // Show analytics drawer
  console.log('Show analytics for:', item.id);
}

async function handleDelete(item: MediaItem, onRefresh: () => void) {
  if (!confirm(`Delete "${item.title}"?`)) return;

  const { error } = await supabase
    .from('media')
    .delete()
    .eq('id', item.id);

  if (!error) {
    onRefresh();
  }
}
```

### YouTube to MP3 Converter Modal

```tsx
function YouTubeConverterModal({ onClose, onConversionComplete }: {
  onClose: () => void;
  onConversionComplete: () => void;
}) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [converting, setConverting] = useState(false);

  const handleConvert = async () => {
    setConverting(true);
    try {
      // Call backend API to convert YouTube to MP3
      const response = await fetch('/api/youtube-to-mp3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      });

      if (response.ok) {
        onConversionComplete();
        onClose();
      }
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-['TAU-Paalai'] mb-4">YouTube to MP3</h2>

        <input
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Paste YouTube URL here..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={converting || !youtubeUrl}
            className="flex-1 px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] disabled:opacity-50"
          >
            {converting ? 'Converting...' : 'Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Media Upload Modal with Supabase Insert

```tsx
function MediaUploadModal({ type, onClose, onUploadComplete }: {
  type: 'songs' | 'videos';
  onClose: () => void;
  onUploadComplete: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    title_tamil: '',
    artist: '',
    artist_tamil: '',
    category: '',
    thumbnail: null as File | null,
    mediaFile: null as File | null
  });
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Upload thumbnail
      const thumbnailPath = `media/thumbnails/${Date.now()}_${formData.thumbnail?.name}`;
      await supabase.storage
        .from('media-assets')
        .upload(thumbnailPath, formData.thumbnail!);

      const { data: thumbnailData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(thumbnailPath);

      // Upload media file
      const mediaPath = `media/${type}/${Date.now()}_${formData.mediaFile?.name}`;
      await supabase.storage
        .from('media-assets')
        .upload(mediaPath, formData.mediaFile!);

      const { data: mediaData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(mediaPath);

      // Insert into database
      const { error } = await supabase
        .from('media')
        .insert({
          title: formData.title,
          title_tamil: formData.title_tamil,
          artist: formData.artist,
          artist_tamil: formData.artist_tamil,
          category: formData.category,
          thumbnail_url: thumbnailData.publicUrl,
          file_url: mediaData.publicUrl,
          file_size: formData.mediaFile?.size || 0,
          type: type === 'songs' ? 'song' : 'video',
          views: 0,
          downloads: 0,
          favorites: 0
        });

      if (!error) {
        onUploadComplete();
        onClose();
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl m-4">
        <h2 className="text-xl font-['TAU-Paalai'] mb-4">
          Upload {type === 'songs' ? 'Song' : 'Video'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title (English) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (English)
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Title (Tamil) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (Tamil)
            </label>
            <input
              type="text"
              required
              value={formData.title_tamil}
              onChange={(e) => setFormData({ ...formData, title_tamil: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['TAU-Nilavu']"
            />
          </div>

          {/* Artist (English) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Artist (English)
            </label>
            <input
              type="text"
              required
              value={formData.artist}
              onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Artist (Tamil) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Artist (Tamil)
            </label>
            <input
              type="text"
              value={formData.artist_tamil}
              onChange={(e) => setFormData({ ...formData, artist_tamil: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['TAU-Nilavu']"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Devotional, Bhajans, etc."
            />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail Image
            </label>
            <input
              type="file"
              required
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, thumbnail: e.target.files?.[0] || null })}
              className="w-full"
            />
          </div>

          {/* Media File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'songs' ? 'Audio File' : 'Video File'}
            </label>
            <input
              type="file"
              required
              accept={type === 'songs' ? 'audio/*' : 'video/*'}
              onChange={(e) => setFormData({ ...formData, mediaFile: e.target.files?.[0] || null })}
              className="w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 3. Sparkle Manager Fixes

### Complete Sparkle Manager Component

```tsx
import { useState, useEffect } from 'react';
import { Sparkles, Plus, Grid3x3, List, Edit, Trash2, Eye, BookOpen, Activity, Share2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface SparkleItem {
  id: string;
  title: string;
  title_tamil: string;
  description: string;
  description_tamil: string;
  content: string;
  content_tamil: string;
  category: string;
  thumbnail_url: string;
  tags: string[];
  views: number;
  reads: number;
  avg_scroll_depth: number;
  shares: number;
  created_at: string;
  updated_at: string;
  published: boolean;
}

export function SparkleManager() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sparkles, setSparkles] = useState<SparkleItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSparkle, setEditingSparkle] = useState<SparkleItem | null>(null);

  useEffect(() => {
    fetchSparkles();
  }, []);

  const fetchSparkles = async () => {
    const { data, error } = await supabase
      .from('sparkles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSparkles(data);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-[#0d5e38]" />
          <h1 className="text-2xl font-['TAU-Paalai']">Sparkle Manager</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Grid/List Toggle */}
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

          {/* Create New Sparkle Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Sparkle
          </button>
        </div>
      </div>

      {/* Sparkle Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sparkles.map((sparkle) => (
            <SparkleCard
              key={sparkle.id}
              sparkle={sparkle}
              onEdit={() => setEditingSparkle(sparkle)}
              onRefresh={fetchSparkles}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sparkles.map((sparkle) => (
            <SparkleListItem
              key={sparkle.id}
              sparkle={sparkle}
              onEdit={() => setEditingSparkle(sparkle)}
              onRefresh={fetchSparkles}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <SparkleEditDrawer
          sparkle={null}
          onClose={() => setShowCreateModal(false)}
          onSave={fetchSparkles}
        />
      )}

      {editingSparkle && (
        <SparkleEditDrawer
          sparkle={editingSparkle}
          onClose={() => setEditingSparkle(null)}
          onSave={fetchSparkles}
        />
      )}
    </div>
  );
}

// Sparkle Card Component (Grid View)
function SparkleCard({ sparkle, onEdit, onRefresh }: {
  sparkle: SparkleItem;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-[#0d5e38] to-[#1a8f5a]">
        {sparkle.thumbnail_url ? (
          <img
            src={sparkle.thumbnail_url}
            alt={sparkle.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-white opacity-50" />
          </div>
        )}
        {!sparkle.published && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
            Draft
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-medium text-gray-900 line-clamp-2">{sparkle.title}</h3>
          <p className="text-sm text-gray-600 font-['TAU-Nilavu'] line-clamp-2">
            {sparkle.title_tamil}
          </p>
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
            {sparkle.description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {sparkle.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Analytics Icons */}
        <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 pt-2 border-t border-gray-200">
          <div className="flex flex-col items-center">
            <Eye className="w-4 h-4 mb-1" />
            <span>{sparkle.views.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center">
            <BookOpen className="w-4 h-4 mb-1" />
            <span>{sparkle.reads.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center">
            <Activity className="w-4 h-4 mb-1" />
            <span>{Math.round(sparkle.avg_scroll_depth)}%</span>
          </div>
          <div className="flex flex-col items-center">
            <Share2 className="w-4 h-4 mb-1" />
            <span>{sparkle.shares.toLocaleString()}</span>
          </div>
        </div>

        {/* Horizontal Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => handleDelete(sparkle.id, onRefresh)}
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

// Sparkle List Item Component (List View)
function SparkleListItem({ sparkle, onEdit, onRefresh }: {
  sparkle: SparkleItem;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="w-24 h-16 rounded bg-gradient-to-br from-[#0d5e38] to-[#1a8f5a] flex items-center justify-center flex-shrink-0">
          {sparkle.thumbnail_url ? (
            <img
              src={sparkle.thumbnail_url}
              alt={sparkle.title}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <Sparkles className="w-6 h-6 text-white opacity-50" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{sparkle.title}</h3>
            {!sparkle.published && (
              <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">Draft</span>
            )}
          </div>
          <p className="text-sm text-gray-600 font-['TAU-Nilavu'] truncate">
            {sparkle.title_tamil}
          </p>
          <p className="text-sm text-gray-500 truncate">{sparkle.description}</p>
        </div>

        {/* Analytics */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {sparkle.views.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {sparkle.reads.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-4 h-4" />
            {Math.round(sparkle.avg_scroll_depth)}%
          </div>
          <div className="flex items-center gap-1">
            <Share2 className="w-4 h-4" />
            {sparkle.shares.toLocaleString()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(sparkle.id, onRefresh)}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Sparkle Edit Drawer with Full Metadata Fields
function SparkleEditDrawer({ sparkle, onClose, onSave }: {
  sparkle: SparkleItem | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    title: sparkle?.title || '',
    title_tamil: sparkle?.title_tamil || '',
    description: sparkle?.description || '',
    description_tamil: sparkle?.description_tamil || '',
    content: sparkle?.content || '',
    content_tamil: sparkle?.content_tamil || '',
    category: sparkle?.category || '',
    tags: sparkle?.tags.join(', ') || '',
    thumbnail: null as File | null,
    published: sparkle?.published || false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let thumbnailUrl = sparkle?.thumbnail_url || '';

      // Upload thumbnail if provided
      if (formData.thumbnail) {
        const thumbnailPath = `sparkles/thumbnails/${Date.now()}_${formData.thumbnail.name}`;
        await supabase.storage
          .from('content-assets')
          .upload(thumbnailPath, formData.thumbnail);

        const { data: thumbnailData } = supabase.storage
          .from('content-assets')
          .getPublicUrl(thumbnailPath);

        thumbnailUrl = thumbnailData.publicUrl;
      }

      const sparkleData = {
        title: formData.title,
        title_tamil: formData.title_tamil,
        description: formData.description,
        description_tamil: formData.description_tamil,
        content: formData.content,
        content_tamil: formData.content_tamil,
        category: formData.category,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        thumbnail_url: thumbnailUrl,
        published: formData.published,
        updated_at: new Date().toISOString()
      };

      if (sparkle) {
        // Update existing
        await supabase
          .from('sparkles')
          .update(sparkleData)
          .eq('id', sparkle.id);
      } else {
        // Create new
        await supabase
          .from('sparkles')
          .insert({
            ...sparkleData,
            views: 0,
            reads: 0,
            avg_scroll_depth: 0,
            shares: 0
          });
      }

      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-3xl sm:rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-['TAU-Paalai']">
            {sparkle ? 'Edit Sparkle' : 'Create New Sparkle'}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title (English) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (English) *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Title (Tamil) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (Tamil) *
            </label>
            <input
              type="text"
              required
              value={formData.title_tamil}
              onChange={(e) => setFormData({ ...formData, title_tamil: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['TAU-Nilavu']"
            />
          </div>

          {/* Description (English) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (English) *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
            />
          </div>

          {/* Description (Tamil) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Tamil) *
            </label>
            <textarea
              required
              value={formData.description_tamil}
              onChange={(e) => setFormData({ ...formData, description_tamil: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['TAU-Nilavu'] resize-none"
            />
          </div>

          {/* Content (English) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Content (English) *
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
            />
          </div>

          {/* Content (Tamil) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Content (Tamil) *
            </label>
            <textarea
              required
              value={formData.content_tamil}
              onChange={(e) => setFormData({ ...formData, content_tamil: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-['TAU-Nilavu'] resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Teachings, Stories, Festivals"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="murugan, devotion, spirituality"
            />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, thumbnail: e.target.files?.[0] || null })}
              className="w-full"
            />
            {sparkle?.thumbnail_url && (
              <img src={sparkle.thumbnail_url} alt="Current" className="mt-2 w-32 h-20 object-cover rounded" />
            )}
          </div>

          {/* Published Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              className="w-4 h-4 text-[#0d5e38] rounded"
            />
            <label htmlFor="published" className="text-sm font-medium text-gray-700">
              Publish immediately
            </label>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] disabled:opacity-50"
          >
            {saving ? 'Saving...' : sparkle ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility Functions
async function handleDelete(id: string, onRefresh: () => void) {
  if (!confirm('Delete this sparkle?')) return;

  const { error } = await supabase
    .from('sparkles')
    .delete()
    .eq('id', id);

  if (!error) {
    onRefresh();
  }
}
```

---

## 4. Left Sidebar Layout (20:80)

### Complete Sidebar Layout Implementation

```tsx
import { useState } from 'react';
import {
  LayoutDashboard,
  Image,
  Wallpaper,
  Music,
  Sparkles,
  Camera,
  Brain,
  Users,
  CreditCard,
  HardDrive,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'banners', label: 'Banners', icon: Image, path: '/admin/banners' },
  { id: 'wallpapers', label: 'Wallpapers', icon: Wallpaper, path: '/admin/wallpapers' },
  { id: 'media', label: 'Media', icon: Music, path: '/admin/media' },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles, path: '/admin/sparkles' },
  { id: 'photos', label: 'Photos', icon: Camera, path: '/admin/photos' },
  { id: 'ai-analytics', label: 'AI Analytics', icon: Brain, path: '/admin/ai-analytics' },
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, path: '/admin/subscriptions' },
  { id: 'storage', label: 'Storage', icon: HardDrive, path: '/admin/storage' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' }
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <aside
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-250 ease-in-out ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#0d5e38] rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-['TAU-Paalai'] text-lg text-[#0d5e38]">
                Murugan Admin
              </h1>
            </div>
          ) : (
            <div className="w-8 h-8 bg-[#0d5e38] rounded-lg flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;

              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => setActiveItem(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-[#0d5e38]/5 text-[#0d5e38]'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#0d5e38]' : ''}`} />
                    {!collapsed && (
                      <span className={`text-sm font-medium ${isActive ? 'text-[#0d5e38]' : ''}`}>
                        {item.label}
                      </span>
                    )}

                    {/* Active Marker - Yellow Left Border */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-yellow-400 rounded-r-full" />
                    )}
                  </button>

                  {/* Tooltip for Collapsed Mode */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Collapse Toggle Button */}
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header (Optional - for user info, search, etc.) */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex-1 max-w-xl">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-700">Online</span>
            </div>

            {/* User Avatar */}
            <img
              src="/admin-avatar.png"
              alt="Admin"
              className="w-9 h-9 rounded-full border-2 border-[#0d5e38]"
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Sidebar Width Rules

- **Expanded:** 256px (w-64)
- **Collapsed:** 64px (w-16)
- **Content Area:** `flex-1` (auto-fills remaining space)
- **Layout Ratio (Expanded):** ~20:80 on desktop screens
- **Layout Ratio (Collapsed):** ~5:95 on desktop screens

### Active State Marker

- **Style:** Yellow left border (`bg-yellow-400`)
- **Width:** 4px (w-1)
- **Height:** 32px (h-8)
- **Position:** Absolute, left-aligned, vertically centered
- **Border Radius:** Rounded on the right side (`rounded-r-full`)

---

## 5. Sidebar Expand/Collapse Feature

### Implementation Details

#### Collapse Button

```tsx
<div className="p-2 border-t border-gray-200">
  <button
    onClick={() => setCollapsed(!collapsed)}
    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
  >
    {collapsed ? (
      <ChevronRight className="w-5 h-5" />
    ) : (
      <>
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm">Collapse</span>
      </>
    )}
  </button>
</div>
```

#### Mini Collapsed Mode (Icons Only)

When collapsed:
- Sidebar width: 64px (`w-16`)
- Only icons visible
- Logo shows compact icon version
- Menu labels hidden
- Tooltips appear on hover

#### Tooltip on Hover

```tsx
{collapsed && (
  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
    {item.label}
  </div>
)}
```

#### Animation

- **Transition Property:** `width`
- **Duration:** 250ms
- **Easing:** `ease-in-out`
- **CSS:** `transition-all duration-250 ease-in-out`

#### State Management

```tsx
const [collapsed, setCollapsed] = useState(false);

// In localStorage (optional persistence)
useEffect(() => {
  const savedState = localStorage.getItem('sidebar-collapsed');
  if (savedState) {
    setCollapsed(savedState === 'true');
  }
}, []);

useEffect(() => {
  localStorage.setItem('sidebar-collapsed', collapsed.toString());
}, [collapsed]);
```

#### Layout Behavior

- **Expanded:** Maintains 20:80 layout ratio
- **Collapsed:** Content area expands to ~95% of screen width
- **Responsive:** On mobile (<768px), sidebar can overlay content or hide completely
- **Smooth Transition:** All width changes animated

---

## 6. Sync Engine Integration Overview

### Architecture

The Sync Engine connects the Admin Backend (content management) with the User App Backend (content delivery).

### Database Schema

#### Admin Backend Tables

```sql
-- Content tables with versioning
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  title_tamil TEXT,
  image_url TEXT NOT NULL,
  banner_type TEXT NOT NULL CHECK (banner_type IN ('wallpaper', 'home', 'media', 'sparkle')),
  link_url TEXT,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed'))
);

CREATE TABLE wallpapers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  title_tamil TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL,
  tags TEXT[],
  dimensions TEXT,
  file_size INTEGER,
  downloads INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending'
);

-- Similar structure for media, sparkles, photos tables

-- Sync log table
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  version INTEGER NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  user_backend_response JSONB,
  success BOOLEAN DEFAULT true
);
```

#### User Backend Tables

```sql
-- Read-only replicas (same structure, no sync fields)
CREATE TABLE banners (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  title_tamil TEXT,
  image_url TEXT NOT NULL,
  banner_type TEXT NOT NULL,
  link_url TEXT,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Similar for other tables
```

### Sync Engine Logic

#### Edge Function: `/admin/sync-engine`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const adminSupabase = createClient(
  Deno.env.get('ADMIN_SUPABASE_URL')!,
  Deno.env.get('ADMIN_SUPABASE_SERVICE_KEY')!
);

const userSupabase = createClient(
  Deno.env.get('USER_SUPABASE_URL')!,
  Deno.env.get('USER_SUPABASE_SERVICE_KEY')!
);

serve(async (req) => {
  const { table, recordId, action } = await req.json();

  try {
    // Fetch from admin backend
    const { data: adminRecord, error: fetchError } = await adminSupabase
      .from(table)
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchError) throw fetchError;

    // Sync to user backend
    if (action === 'insert' || action === 'update') {
      const { error: syncError } = await userSupabase
        .from(table)
        .upsert(adminRecord);

      if (syncError) throw syncError;
    } else if (action === 'delete') {
      const { error: deleteError } = await userSupabase
        .from(table)
        .delete()
        .eq('id', recordId);

      if (deleteError) throw deleteError;
    }

    // Update sync status in admin backend
    await adminSupabase
      .from(table)
      .update({
        sync_status: 'synced',
        synced_at: new Date().toISOString()
      })
      .eq('id', recordId);

    // Log sync
    await adminSupabase
      .from('sync_log')
      .insert({
        table_name: table,
        record_id: recordId,
        action,
        version: adminRecord.version,
        success: true
      });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Sync error:', error);

    // Update sync status to failed
    await adminSupabase
      .from(table)
      .update({ sync_status: 'failed' })
      .eq('id', recordId);

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### OnWrite Triggers

#### Database Trigger (PostgreSQL)

```sql
-- Function to trigger sync
CREATE OR REPLACE FUNCTION trigger_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sync status to pending
  NEW.sync_status = 'pending';
  NEW.version = COALESCE(OLD.version, 0) + 1;
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on banners table
CREATE TRIGGER banners_sync_trigger
BEFORE INSERT OR UPDATE ON banners
FOR EACH ROW
EXECUTE FUNCTION trigger_sync();

-- Similar triggers for other tables
```

#### Client-Side Sync Call

```typescript
// After successful insert/update in admin panel
const triggerSync = async (table: string, recordId: string, action: string) => {
  try {
    const response = await fetch('/admin/sync-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, recordId, action })
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Sync trigger failed:', error);
    return false;
  }
};

// Usage in upload handler
const handleUpload = async () => {
  // ... upload logic ...
  
  const { data, error } = await supabase
    .from('banners')
    .insert(bannerData)
    .select()
    .single();

  if (!error && data) {
    // Trigger sync
    await triggerSync('banners', data.id, 'insert');
  }
};
```

### Real-Time Listeners (Optional)

```typescript
// Admin Panel - Listen for sync status changes
const subscription = supabase
  .channel('sync-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'banners',
    filter: `sync_status=eq.synced`
  }, (payload) => {
    console.log('Item synced:', payload.new);
    // Update UI to show sync success
  })
  .subscribe();
```

### Offline-First Behavior

- Admin changes are saved locally first
- Sync happens asynchronously in the background
- UI shows sync status (pending/syncing/synced/failed)
- Failed syncs can be retried manually
- Batch sync available for bulk operations

---

## 7. Image Optimization Pipeline

### Multi-Resolution Strategy

All uploaded images should be processed into multiple sizes:

| Size | Max Width | Max Height | Use Case |
|------|-----------|------------|----------|
| Thumbnail | 200px | 200px | Grid previews, lists |
| Small | 400px | 400px | Mobile devices |
| Medium | 800px | 800px | Tablets, small desktops |
| Large | 1920px | 1920px | Full-screen displays |
| Original | - | - | Archive, downloads |

### Format Conversion

```typescript
// Edge Function: /admin/optimize-image
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

serve(async (req) => {
  const formData = await req.formData();
  const file = formData.get('image') as File;
  
  const arrayBuffer = await file.arrayBuffer();
  const image = await Image.decode(new Uint8Array(arrayBuffer));

  const sizes = [
    { name: 'thumbnail', width: 200 },
    { name: 'small', width: 400 },
    { name: 'medium', width: 800 },
    { name: 'large', width: 1920 }
  ];

  const results = {};

  for (const size of sizes) {
    const resized = image.resize(size.width, Image.RESIZE_AUTO);
    
    // WebP
    const webp = await resized.encodeWebP(80);
    results[`${size.name}_webp`] = webp;
    
    // AVIF (better compression)
    const avif = await resized.encodeAVIF({ quality: 75 });
    results[`${size.name}_avif`] = avif;
    
    // Fallback JPEG
    const jpeg = await resized.encodeJPEG(85);
    results[`${size.name}_jpeg`] = jpeg;
  }

  // Generate LQIP (Low Quality Image Placeholder)
  const lqip = image.resize(20, Image.RESIZE_AUTO);
  const lqipBase64 = btoa(String.fromCharCode(...await lqip.encodeJPEG(40)));
  results.lqip = `data:image/jpeg;base64,${lqipBase64}`;

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### LQIP (Low Quality Image Placeholder) Generation

```typescript
// Generate 20px wide placeholder
const generateLQIP = async (imageBuffer: ArrayBuffer): Promise<string> => {
  const image = await Image.decode(new Uint8Array(imageBuffer));
  const tiny = image.resize(20, Image.RESIZE_AUTO);
  const jpegBuffer = await tiny.encodeJPEG(40);
  const base64 = btoa(String.fromCharCode(...jpegBuffer));
  return `data:image/jpeg;base64,${base64}`;
};
```

### Responsive Image Component

```tsx
interface OptimizedImageProps {
  src: string;
  srcSet?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  lqip?: string;
  alt: string;
  className?: string;
}

export function OptimizedImage({ src, srcSet, lqip, alt, className }: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* LQIP Placeholder */}
      {lqip && !loaded && (
        <img
          src={lqip}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm"
        />
      )}

      {/* Full Image with srcset */}
      <picture>
        {srcSet?.large && (
          <source
            media="(min-width: 1280px)"
            srcSet={`${srcSet.large}.avif`}
            type="image/avif"
          />
        )}
        {srcSet?.large && (
          <source
            media="(min-width: 1280px)"
            srcSet={`${srcSet.large}.webp`}
            type="image/webp"
          />
        )}
        {srcSet?.medium && (
          <source
            media="(min-width: 768px)"
            srcSet={`${srcSet.medium}.avif`}
            type="image/avif"
          />
        )}
        {srcSet?.medium && (
          <source
            media="(min-width: 768px)"
            srcSet={`${srcSet.medium}.webp`}
            type="image/webp"
          />
        )}
        {srcSet?.small && (
          <source
            media="(max-width: 767px)"
            srcSet={`${srcSet.small}.avif`}
            type="image/avif"
          />
        )}
        {srcSet?.small && (
          <source
            media="(max-width: 767px)"
            srcSet={`${srcSet.small}.webp`}
            type="image/webp"
          />
        )}
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </picture>
    </div>
  );
}
```

### Storage Structure

```
storage/
├── banners/
│   ├── originals/
│   ├── thumbnails/
│   ├── small/
│   ├── medium/
│   └── large/
├── wallpapers/
│   ├── originals/
│   ├── thumbnails/
│   ├── small/
│   ├── medium/
│   └── large/
└── media/
    ├── thumbnails/
    ├── videos/
    └── audio/
```

---

## 8. AI Chat Logging Architecture

### Database Schema

```sql
-- AI chat sessions
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  device_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_messages INTEGER DEFAULT 0,
  duration_seconds INTEGER
);

-- AI chat messages
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES ai_chat_sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  content_tamil TEXT,
  language TEXT DEFAULT 'en',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INTEGER,
  tokens_used INTEGER
);

-- AI chat analytics
CREATE TABLE ai_chat_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_session_duration_seconds REAL,
  avg_messages_per_session REAL,
  avg_response_time_ms REAL,
  total_tokens_used INTEGER,
  top_questions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_sessions_user ON ai_chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON ai_chat_messages(session_id);
CREATE INDEX idx_chat_analytics_date ON ai_chat_analytics(date);
```

### Logging Functions

```typescript
// Create new chat session
export async function createChatSession(userId?: string, deviceId?: string) {
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      user_id: userId,
      device_id: deviceId
    })
    .select()
    .single();

  return data;
}

// Log chat message
export async function logChatMessage({
  sessionId,
  role,
  content,
  contentTamil,
  language,
  responseTimeMs,
  tokensUsed
}: {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  contentTamil?: string;
  language?: string;
  responseTimeMs?: number;
  tokensUsed?: number;
}) {
  const { error } = await supabase
    .from('ai_chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      content_tamil: contentTamil,
      language,
      response_time_ms: responseTimeMs,
      tokens_used: tokensUsed
    });

  // Update session message count
  await supabase.rpc('increment_session_messages', { session_id: sessionId });

  return !error;
}

// End chat session
export async function endChatSession(sessionId: string) {
  const { data: session } = await supabase
    .from('ai_chat_sessions')
    .select('started_at, total_messages')
    .eq('id', sessionId)
    .single();

  if (session) {
    const duration = Math.floor(
      (new Date().getTime() - new Date(session.started_at).getTime()) / 1000
    );

    await supabase
      .from('ai_chat_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: duration
      })
      .eq('id', sessionId);
  }
}
```

### Analytics Extraction

```typescript
// Daily analytics aggregation (run as cron job)
export async function aggregateDailyAnalytics(date: string) {
  const { data: sessions } = await supabase
    .from('ai_chat_sessions')
    .select('*, ai_chat_messages(*)')
    .gte('started_at', `${date}T00:00:00`)
    .lt('started_at', `${date}T23:59:59`);

  if (!sessions) return;

  const totalSessions = sessions.length;
  const totalMessages = sessions.reduce((sum, s) => sum + s.total_messages, 0);
  const avgSessionDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / totalSessions;
  const avgMessagesPerSession = totalMessages / totalSessions;

  // Calculate avg response time
  const allMessages = sessions.flatMap(s => s.ai_chat_messages || []);
  const assistantMessages = allMessages.filter(m => m.role === 'assistant' && m.response_time_ms);
  const avgResponseTime = assistantMessages.reduce((sum, m) => sum + m.response_time_ms, 0) / assistantMessages.length;

  // Extract top questions
  const userMessages = allMessages.filter(m => m.role === 'user');
  const questionCounts = {};
  userMessages.forEach(m => {
    const question = m.content.toLowerCase().trim();
    questionCounts[question] = (questionCounts[question] || 0) + 1;
  });

  const topQuestions = Object.entries(questionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([question, count]) => ({ question, count }));

  // Insert analytics
  await supabase
    .from('ai_chat_analytics')
    .insert({
      date,
      total_sessions: totalSessions,
      total_messages: totalMessages,
      avg_session_duration_seconds: avgSessionDuration,
      avg_messages_per_session: avgMessagesPerSession,
      avg_response_time_ms: avgResponseTime,
      total_tokens_used: allMessages.reduce((sum, m) => sum + (m.tokens_used || 0), 0),
      top_questions: topQuestions
    });
}
```

### AI Analytics Dashboard View

```tsx
export function AIAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data } = await supabase
      .from('ai_chat_analytics')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    setAnalytics(data);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-['TAU-Paalai']">AI Analytics</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="Total Sessions"
          value={analytics?.[0]?.total_sessions}
          icon={Brain}
        />
        <StatCard
          title="Total Messages"
          value={analytics?.[0]?.total_messages}
          icon={MessageSquare}
        />
        <StatCard
          title="Avg Session Duration"
          value={`${Math.round(analytics?.[0]?.avg_session_duration_seconds || 0)}s`}
          icon={Clock}
        />
        <StatCard
          title="Avg Response Time"
          value={`${Math.round(analytics?.[0]?.avg_response_time_ms || 0)}ms`}
          icon={Zap}
        />
      </div>

      {/* Top Questions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium mb-4">Top Questions</h2>
        <div className="space-y-2">
          {analytics?.[0]?.top_questions?.slice(0, 10).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700">{item.question}</span>
              <span className="text-sm font-medium text-[#0d5e38]">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 9. Responsive Behavior Rules

### Breakpoints

```css
/* Mobile First Approach */
/* xs: 0-639px (default) */
/* sm: 640px+ */
/* md: 768px+ */
/* lg: 1024px+ */
/* xl: 1280px+ */
/* 2xl: 1536px+ */
```

### Sidebar Behavior

#### Desktop (>= 1024px)
- Sidebar visible by default
- Can be collapsed to icon-only mode
- Maintains 20:80 or 5:95 layout ratio

#### Tablet (768px - 1023px)
- Sidebar starts collapsed
- Can be expanded with overlay mode
- Content shifts when expanded (push mode)

#### Mobile (< 768px)
- Sidebar hidden by default
- Hamburger menu button in header
- Sidebar slides in from left as overlay
- Full-screen backdrop when open

### Header Behavior

- **Desktop:** Full search bar visible, user avatar on right
- **Tablet:** Condensed search (icon), user avatar
- **Mobile:** Hamburger menu, logo, user avatar only

### Grid Scaling

```tsx
// Responsive grid classes
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
  {/* Cards */}
</div>
```

### Card Spacing

- **Mobile:** 16px (gap-4)
- **Desktop:** 24px (gap-6)
- **Padding:** Consistent 16px (p-4) on all sizes

### Typography Scaling

```tsx
// Headings
<h1 className="text-xl md:text-2xl lg:text-3xl font-['TAU-Paalai']">

// Body text
<p className="text-sm md:text-base">

// Labels
<span className="text-xs md:text-sm">
```

### Mobile Sidebar Implementation

```tsx
export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Sidebar content */}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with hamburger */}
        <header className="h-16 bg-white border-b flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-600"
          >
            <Menu className="w-6 h-6" />
          </button>
          {/* Rest of header */}
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Touch Interactions

- Minimum touch target size: 44x44px
- Increased padding on mobile buttons
- Swipe gestures for carousels
- Pull-to-refresh support (optional)

---

## 10. Components That Should NOT Change

### Brand Theme Colors

**Primary Green:** `#0d5e38`
- Backgrounds
- Active states
- Primary buttons
- Accent elements

**Never change without explicit approval:**
- All color values
- Gradient definitions
- Opacity variations

### Tamil Fonts

**DO NOT MODIFY:**
- Font family declarations
- Font file imports
- Font fallback stacks

**Mandatory Rules:**
- TAU-Paalai Bold for titles
- TAU-Nilavu Regular for body text
- Inter for English fallback

### Icon Library

**Lucide React Icons**
- Do not replace with other icon libraries
- Maintain consistent icon sizing (w-4 h-4, w-5 h-5, w-6 h-6)
- Do not use custom SVG icons unless absolutely necessary

### Chart Components

**Recharts Library**
- Keep all chart configurations
- Maintain color schemes
- Do not replace with other charting libraries

### Data Model Structure

**Database Tables:**
- Do not rename tables without migration plan
- Do not remove columns without deprecation
- Maintain foreign key relationships
- Keep version fields for sync engine

**Core Fields (Never Remove):**
- `id` (UUID primary key)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `version` (integer for sync)
- `sync_status` (for admin tables)

### ShadCN Components

**Protected Components:**
- All files in `/components/ui/`
- Do not modify component APIs
- Do not change default styling tokens
- Maintain accessibility attributes

**Customization:**
- Only modify through Tailwind classes
- Create wrapper components if needed
- Do not edit component source directly

### Animation Timings

**Standard Durations:**
- Quick transitions: 150ms
- Standard transitions: 250ms
- Slow transitions: 300ms
- Page transitions: 500ms

**DO NOT:**
- Use arbitrary animation values
- Create inconsistent timing
- Remove transitions entirely

### Accessibility Patterns

**Maintain:**
- ARIA labels and roles
- Keyboard navigation support
- Focus visible states
- Screen reader compatibility
- Color contrast ratios (WCAG AA minimum)

---

## Implementation Checklist

### Phase 1: Layout Migration
- [ ] Convert header navigation to left sidebar
- [ ] Implement 20:80 layout ratio
- [ ] Add collapse/expand functionality
- [ ] Add tooltips for collapsed mode
- [ ] Test responsive behavior on all breakpoints
- [ ] Add keyboard shortcuts for sidebar toggle

### Phase 2: Manager Fixes
- [ ] Implement complete Media Manager with categories
- [ ] Add Songs/Videos tab switcher
- [ ] Build YouTube to MP3 converter modal
- [ ] Add grid/list toggle to Media Manager
- [ ] Implement complete Sparkle Manager
- [ ] Add all metadata fields to Sparkle edit drawer
- [ ] Add analytics icons to both managers
- [ ] Wire up Supabase insert/update/delete logic

### Phase 3: Backend Integration
- [ ] Set up sync engine edge function
- [ ] Create database triggers for auto-sync
- [ ] Implement version tracking
- [ ] Add sync status indicators in UI
- [ ] Build sync log viewer
- [ ] Test dual-backend connectivity

### Phase 4: Optimization
- [ ] Implement image optimization pipeline
- [ ] Generate multi-resolution images
- [ ] Add LQIP generation
- [ ] Create OptimizedImage component
- [ ] Update all image references
- [ ] Test loading performance

### Phase 5: Analytics
- [ ] Create AI chat logging schema
- [ ] Implement chat session tracking
- [ ] Build analytics aggregation function
- [ ] Create AI Analytics dashboard
- [ ] Add top questions extraction
- [ ] Set up daily cron job for analytics

### Phase 6: Testing & Polish
- [ ] Test all CRUD operations
- [ ] Verify sync engine reliability
- [ ] Test responsive layouts
- [ ] Verify font rendering (Tamil + English)
- [ ] Test image optimization
- [ ] Performance audit
- [ ] Accessibility audit

---

## Common Pitfalls & Solutions

### Issue: Sidebar Animation Janky
**Solution:** Use `transform` instead of `width` for animations. Add `will-change: transform` for GPU acceleration.

### Issue: Sync Fails Silently
**Solution:** Always log sync errors. Show retry button in UI. Implement exponential backoff for retries.

### Issue: Images Load Slowly
**Solution:** Ensure LQIP is displayed first. Use `loading="lazy"` for off-screen images. Implement intersection observer for progressive loading.

### Issue: Mobile Sidebar Doesn't Close
**Solution:** Add backdrop click handler. Add escape key handler. Add swipe-to-close gesture.

### Issue: Tamil Fonts Not Loading
**Solution:** Verify font files are in `/public/fonts/`. Check font-face declarations in `/styles/globals.css`. Add font preload in HTML head.

### Issue: Analytics Data Inconsistent
**Solution:** Use database transactions for atomic updates. Add unique constraints. Implement idempotent aggregation functions.

---

## Maintenance Notes

### Regular Tasks

**Daily:**
- Monitor sync log for failures
- Check storage usage
- Review AI chat analytics

**Weekly:**
- Optimize database queries
- Clean up orphaned files
- Review user feedback

**Monthly:**
- Database backup verification
- Performance audit
- Security patch updates
- Font license renewal check

### Update Procedures

**When Adding New Content Type:**
1. Create table in admin backend
2. Create matching table in user backend
3. Add sync trigger
4. Update sync engine
5. Create manager component
6. Add to sidebar menu
7. Test full CRUD + sync

**When Modifying Existing Table:**
1. Create migration for admin backend
2. Create matching migration for user backend
3. Update sync engine if schema changed
4. Update UI components
5. Test backward compatibility
6. Deploy with zero-downtime strategy

---

## Environment Variables

### Admin Backend
```
ADMIN_SUPABASE_URL=https://[project-id].supabase.co
ADMIN_SUPABASE_ANON_KEY=[anon-key]
ADMIN_SUPABASE_SERVICE_KEY=[service-key]
USER_SUPABASE_URL=https://[user-project-id].supabase.co
USER_SUPABASE_SERVICE_KEY=[user-service-key]
```

### User Backend
```
USER_SUPABASE_URL=https://[user-project-id].supabase.co
USER_SUPABASE_ANON_KEY=[user-anon-key]
USER_SUPABASE_SERVICE_KEY=[user-service-key]
```

### Frontend (Admin Panel)
```
NEXT_PUBLIC_ADMIN_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY=[anon-key]
```

### Frontend (User App)
```
NEXT_PUBLIC_USER_SUPABASE_URL=https://[user-project-id].supabase.co
NEXT_PUBLIC_USER_SUPABASE_ANON_KEY=[user-anon-key]
```

---

## Version History

- **v1.0** - Initial Admin Panel with basic CRUD
- **v1.1** - Added banner_type dropdown, fixed CORS
- **v1.2** - Converted to left sidebar layout (20:80)
- **v1.3** - Added Media Manager with categories
- **v1.4** - Added Sparkle Manager with full metadata
- **v1.5** - Implemented Sync Engine
- **v1.6** - Added Image Optimization Pipeline
- **v1.7** - Implemented AI Chat Logging & Analytics
- **v2.0** - Production-ready with all features (**Current**)

---

## Support & Contact

For technical issues, contact the development team or refer to:
- Supabase Documentation: https://supabase.com/docs
- Tailwind CSS: https://tailwindcss.com
- React Documentation: https://react.dev

---

**End of Document**
