import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { Upload, Video, Music } from 'lucide-react';
import { SeedDataButton } from './SeedDataButton';
import { MuruganLoader } from './MuruganLoader';

export function AdminUpload() {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    type: 'song' as 'song' | 'video',
    youtubeUrl: '',
    isDraft: false,
    scheduleDate: '',
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
      if (selectedFile.type.startsWith('audio/')) {
        setFormData({ ...formData, type: 'song' });
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
    const { error } = await supabase.storage
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
      const bucket = formData.type === 'song' ? 'media-audio' : 'media-videos';
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const filename = `${timestamp}.${extension}`;
      
      const storagePath = await uploadFile(file, bucket, filename);

      // Upload thumbnail
      let thumbnailUrl = storagePath;
      if (thumbnailFile) {
        const thumbExtension = thumbnailFile.name.split('.').pop();
        const thumbFilename = `${timestamp}_thumb.${thumbExtension}`;
        thumbnailUrl = await uploadFile(thumbnailFile, 'media-images', thumbFilename);
      }

      // Prepare payload for Supabase
      const payload: any = {
        title: formData.title,
        category: formData.category,
        type: formData.type,
        youtubeUrl: formData.youtubeUrl,
        thumbnailUrl: thumbnailUrl,
        isDraft: formData.isDraft,
        scheduleDate: formData.scheduleDate || null,
      };
      if (formData.type === 'song') {
        payload.audioUrl = storagePath;
      } else if (formData.type === 'video') {
        payload.videoUrl = storagePath;
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
          body: JSON.stringify(payload),
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
        category: '',
        type: 'song',
        youtubeUrl: '',
        isDraft: false,
        scheduleDate: '',
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
              accept="audio/*,video/*"
              onChange={handleFileChange}
              required
              className="mt-1"
            />
            {previewUrl && (
              <div className="mt-2">
                {formData.type === 'song' ? (
                  <audio src={previewUrl} controls className="w-full" />
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
              onValueChange={(value: 'song' | 'video') =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="song">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Song
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
              placeholder="Song or Video Title"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              placeholder="e.g. Devotional, Bhajan, Kids, etc."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="youtubeUrl">YouTube URL</Label>
            <Input
              id="youtubeUrl"
              type="text"
              value={formData.youtubeUrl}
              onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
              placeholder="https://youtube.com/..."
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDraft"
              checked={formData.isDraft}
              onChange={(e) => setFormData({ ...formData, isDraft: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="isDraft" className="cursor-pointer">
              Save as Draft
            </Label>
          </div>
          <div>
            <Label htmlFor="scheduleDate">Schedule Date</Label>
            <Input
              id="scheduleDate"
              type="date"
              value={formData.scheduleDate}
              onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
              className="mt-1"
            />
          </div>
          <Button
            type="submit"
            disabled={uploading}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {uploading ? (
              <>
                <MuruganLoader variant="button" className="mr-2" />
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
