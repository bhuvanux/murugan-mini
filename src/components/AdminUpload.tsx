import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { Upload, Loader2, Image, Video } from 'lucide-react';
import { Badge } from './ui/badge';
import { SeedDataButton } from './SeedDataButton';
import { compressImage } from '../utils/compressionHelper';

export function AdminUpload() {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    type: 'image' as 'image' | 'video',
    downloadable: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));

      // Auto-detect type
      if (selectedFile.type.startsWith('image/')) {
        setFormData({ ...formData, type: 'image' });
      } else if (selectedFile.type.startsWith('video/')) {
        setFormData({ ...formData, type: 'video' });
      }
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setThumbnailFile(selectedFile);
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (formData.type === 'video' && !thumbnailFile) {
      toast.error('Please select a thumbnail for the video');
      return;
    }

    setUploading(true);

    try {
      // Upload main file
      const bucket = formData.type === 'image' ? 'media-images' : 'media-videos';
      const timestamp = Date.now();

      // 1. Guardrail: Max file size check (20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File is too large (>20MB). Please pick a smaller file.");
        setUploading(false);
        return;
      }

      let fileToUpload = file;
      let originalSize = file.size;
      let optimizedSize = file.size;

      // Compress if it is an image
      if (formData.type === 'image') {
        console.log(`[Upload] Starting compression for ${file.name}. Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        try {
          const result = await compressImage(file);
          fileToUpload = result.file;
          originalSize = result.originalSize;
          optimizedSize = result.optimizedSize;

          console.log(`[Upload] Compression complete. New size: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`[Upload] Savings: ${((1 - optimizedSize / originalSize) * 100).toFixed(0)}%`);
        } catch (err) {
          console.error("Compression failed in AdminUpload:", err);
          // 2. Guardrail: Fail if compression fails
          toast.error("Image optimization failed. Upload cancelled.");
          setUploading(false);
          return;
        }
      }

      const extension = fileToUpload.name.split('.').pop(); // Use compressed file extension (likely webp)
      const filename = `${timestamp}.${extension}`;

      const storagePath = await uploadFile(fileToUpload, bucket, filename);

      // Upload thumbnail
      let thumbnailUrl = storagePath;
      if (thumbnailFile) {
        // Theoretically we should compress thumbnail too, but let's keep it simple for now or reuse logic
        // For distinct thumbnail uploads, we can just use the helper too
        let thumbToUpload = thumbnailFile;
        try {
          const thumbResult = await compressImage(thumbnailFile, 400); // Smaller for thumbnail
          thumbToUpload = thumbResult.file;
        } catch (e) { console.warn("Thumb compression failed"); }

        const thumbExtension = thumbToUpload.name.split('.').pop();
        const thumbFilename = `${timestamp}_thumb.${thumbExtension}`;
        thumbnailUrl = await uploadFile(thumbToUpload, 'media-images', thumbFilename);
      }

      // Get video duration if it's a video
      let durationSeconds = null;
      if (formData.type === 'video') {
        durationSeconds = await getVideoDuration(file);
      }

      // Create media record via API
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/admin/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            type: formData.type,
            storage_path: storagePath,
            thumbnail_url: thumbnailUrl,
            duration_seconds: durationSeconds,
            downloadable: formData.downloadable,
            uploader: 'admin',
            original_size_bytes: originalSize,
            optimized_size_bytes: optimizedSize,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create media record');
      }

      toast.success('Media uploaded successfully!');

      // Reset form
      setFormData({
        title: '',
        description: '',
        tags: '',
        type: 'image',
        downloadable: true,
      });
      setFile(null);
      setThumbnailFile(null);
      setPreviewUrl('');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.floor(video.duration));
      };
      video.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-blue-900 mb-2">📋 Quick Setup</h3>
        <ol className="text-sm text-gray-700 space-y-1 mb-3 list-decimal list-inside">
          <li>Make sure you've created the database tables in Supabase (see Profile → Database Setup Guide)</li>
          <li>Click "Load Sample Data" below to add 10 devotional images</li>
          <li>Or upload your own images/videos using the form below</li>
        </ol>
      </div>

      <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <p className="text-sm text-gray-700 mb-3">
          <strong>Easiest way to get started:</strong> Load sample devotional images with one click
        </p>
        <SeedDataButton />
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Upload className="w-6 h-6 text-orange-500" />
          <h2 className="text-orange-600">Admin: Upload Media</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="file">Media File *</Label>
            <Input
              id="file"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              required
              className="mt-1"
            />
            {previewUrl && (
              <div className="mt-2">
                {formData.type === 'image' ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded" />
                ) : (
                  <video src={previewUrl} className="w-full h-48 object-cover rounded" controls />
                )}
              </div>
            )}
          </div>

          {formData.type === 'video' && (
            <div>
              <Label htmlFor="thumbnail">Video Thumbnail *</Label>
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                required
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'image' | 'video') =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Image
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Video
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Lord Murugan with Peacock"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the media"
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="murugan, peacock, devotional"
              className="mt-1"
            />
            {formData.tags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.split(',').map((tag, i) => (
                  <Badge key={i} variant="secondary">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="downloadable"
              checked={formData.downloadable}
              onChange={(e) => setFormData({ ...formData, downloadable: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="downloadable" className="cursor-pointer">
              Allow users to download
            </Label>
          </div>

          <Button
            type="submit"
            disabled={uploading}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </>
            )}
          </Button>
        </form>
      </Card>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Make sure storage buckets are configured in Supabase:</p>
        <p className="mt-1">media-images and media-videos</p>
      </div>
    </div>
  );
}
