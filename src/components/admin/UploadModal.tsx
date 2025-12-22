import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Loader2, CheckCircle, FolderPlus, Calendar } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  uploadType: "banner" | "wallpaper" | "photo" | "media" | "sparkle";
  uploadFunction: (file: File | null, data: any) => Promise<any>;
  folders?: Array<{ id: string; name: string }>;
  onCreateFolder?: (name: string, description?: string) => Promise<void>;
}

interface FileItem {
  file: File;
  preview: string | null;
  id: string;
}

async function compressImageToWebp(file: File): Promise<{ file: File; compressed: boolean }> {
  if (!file.type.startsWith("image/")) {
    return { file, compressed: false };
  }

  try {
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
    URL.revokeObjectURL(url);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, compressed: false };

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", 0.82),
    );

    if (!blob) return { file, compressed: false };

    // Only keep if we actually reduced size meaningfully
    if (blob.size >= file.size * 0.95) {
      return { file, compressed: false };
    }

    const outName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    const outFile = new File([blob], outName, { type: "image/webp" });
    return { file: outFile, compressed: true };
  } catch {
    return { file, compressed: false };
  }
}

async function compressVideoBestEffort(file: File): Promise<{ file: File; compressed: boolean; method?: string }> {
  if (!file.type.startsWith("video/")) {
    return { file, compressed: false };
  }

  // Best-effort: use MediaRecorder to re-encode with lower bitrate when supported.
  // If not supported (common on some browsers), fall back to original.
  try {
    const mimeCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    const mimeType = mimeCandidates.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
    if (!mimeType) return { file, compressed: false };

    const videoEl = document.createElement("video");
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.preload = "auto";
    const url = URL.createObjectURL(file);
    videoEl.src = url;
    await new Promise<void>((resolve, reject) => {
      videoEl.onloadedmetadata = () => resolve();
      videoEl.onerror = () => reject(new Error("Failed to load video"));
    });

    const stream = (videoEl as any).captureStream?.();
    if (!stream) {
      URL.revokeObjectURL(url);
      return { file, compressed: false };
    }

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 1_200_000,
    });

    const resultBlob: Blob = await new Promise((resolve, reject) => {
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = () => reject(new Error("Video compression failed"));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.start(250);
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {
        // Some browsers require user gesture; in that case, bail.
        recorder.stop();
      });
      setTimeout(() => {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }, Math.min(15_000, Math.max(3_000, (videoEl.duration || 3) * 1000)));
    });

    URL.revokeObjectURL(url);

    if (resultBlob.size >= file.size * 0.95) {
      return { file, compressed: false };
    }

    const outName = file.name.replace(/\.[^/.]+$/, "") + ".webm";
    const outFile = new File([resultBlob], outName, { type: mimeType });
    return { file: outFile, compressed: true, method: "mediarecorder" };
  } catch {
    return { file, compressed: false };
  }
}

export function UploadModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  uploadType,
  uploadFunction,
  folders = [],
  onCreateFolder,
}: UploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const isSparkleUpload = uploadType === "sparkle";
  const maxFiles = (uploadType === "sparkle" || uploadType === "wallpaper") ? 15 : 50;

  // Form fields
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    publishStatus: "draft" as "draft" | "published" | "scheduled",
    folderId: "",
    scheduleDate: undefined as Date | undefined,
    
    // Banner-specific
    bannerType: "wallpaper" as "wallpaper" | "home" | "media" | "sparkle",
    
    // Media-specific
    mediaType: "audio" as "audio" | "video" | "youtube",
    youtubeUrl: "",
    artist: "",
    
    // Sparkle-specific
    subtitle: "",
    content: "",
    author: "Admin",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, maxFiles - selectedFiles.length);
    if (remainingSlots <= 0) {
      toast.error(`You can upload a maximum of ${maxFiles} files at a time`);
      return;
    }

    const newFiles: FileItem[] = [];

    files.slice(0, remainingSlots).forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 200 * 1024 * 1024 : 50 * 1024 * 1024;

      if (file.size > maxSize) {
        toast.error(
          `${file.name}: File size must be less than ${isVideo ? "200MB" : "50MB"}`,
        );
        return;
      }

      const fileItem: FileItem = {
        file,
        preview: null,
        id: Math.random().toString(36).substring(7),
      };

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          fileItem.preview = reader.result as string;
          setSelectedFiles((prev) => [
            ...prev.filter((existing) => existing.id !== fileItem.id),
            fileItem,
          ]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("video/")) {
        fileItem.preview = URL.createObjectURL(file);
      }

      newFiles.push(fileItem);
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    if (!onCreateFolder) {
      toast.error("Folder creation not supported");
      return;
    }

    try {
      await onCreateFolder(newFolderName.trim());
      toast.success("Folder created successfully");
      setNewFolderName("");
      setShowNewFolderInput(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create folder");
    }
  };

  const handleUpload = async () => {
    const isTitleRequired = uploadType !== "wallpaper" && uploadType !== "sparkle" && selectedFiles.length === 1;

    if (isTitleRequired && !formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (uploadType === "media" && formData.mediaType === "youtube") {
      if (!formData.youtubeUrl.trim()) {
        toast.error("Please enter a YouTube URL");
        return;
      }
    } else {
      const hasFiles = selectedFiles.length > 0;

      if (uploadType === "sparkle") {
        if (!hasFiles) {
          toast.error("Please upload a sparkle image or video");
          return;
        }
      } else if (!hasFiles) {
        toast.error("Please select at least one file");
        return;
      }
    }

    if ((uploadType === "sparkle" || uploadType === "wallpaper") && selectedFiles.length > maxFiles) {
      toast.error(`You can upload a maximum of ${maxFiles} files at a time`);
      return;
    }

    // Validate scheduled date
    if (formData.publishStatus === "scheduled" && !formData.scheduleDate) {
      toast.error("Please select a schedule date");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90));
      }, 300);

      const uploaded: any[] = [];
      const errors: Array<{ name: string; error: string }> = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const fileItem = selectedFiles[i];
        const fallbackTitle = fileItem.file.name.replace(/\.[^/.]+$/, "");

        const originalBytes = fileItem.file.size;
        let workingFile = fileItem.file;
        let compressedBytes = originalBytes;
        let compressionApplied = false;
        let compressionMethod: string | undefined;

        if (workingFile.type.startsWith("image/")) {
          const res = await compressImageToWebp(workingFile);
          workingFile = res.file;
          compressedBytes = res.file.size;
          compressionApplied = res.compressed;
          compressionMethod = res.compressed ? "canvas-webp" : undefined;
        } else if (workingFile.type.startsWith("video/")) {
          const res = await compressVideoBestEffort(workingFile);
          workingFile = res.file;
          compressedBytes = res.file.size;
          compressionApplied = res.compressed;
          compressionMethod = res.method;
        }

        const uploadData: any = {
          title:
            uploadType === "sparkle"
              ? (formData.title.trim() || fallbackTitle)
              : formData.title || fallbackTitle,
          description: formData.description,
          tags: formData.tags,
          publishStatus: formData.publishStatus,
          folder_id: formData.folderId || undefined,
          scheduled_at: formData.scheduleDate ? formData.scheduleDate.toISOString() : undefined,
          metadata: JSON.stringify({
            original_bytes: originalBytes,
            compressed_bytes: compressedBytes,
            compression_applied: compressionApplied,
            compression_method: compressionMethod,
            original_mime: fileItem.file.type,
            final_mime: workingFile.type,
            original_name: fileItem.file.name,
            final_name: workingFile.name,
          }),
        };

        if (uploadType === "banner") {
          uploadData.bannerType = formData.bannerType;
        }

        if (uploadType === "media") {
          uploadData.mediaType = formData.mediaType;
          uploadData.artist = formData.artist;
          if (formData.mediaType === "youtube") {
            uploadData.youtubeUrl = formData.youtubeUrl;
          }
        }

        if (uploadType === "sparkle") {
          uploadData.subtitle = formData.subtitle?.trim() || undefined;
          uploadData.content = formData.content?.trim() || formData.description?.trim() || undefined;
          uploadData.author = formData.author;

          if (workingFile.type.startsWith("video/")) {
            uploadData.videoFile = workingFile;
            try {
              const res = await uploadFunction(null, uploadData);
              uploaded.push(res);
            } catch (e: any) {
              errors.push({ name: fileItem.file.name, error: e?.message || "Upload failed" });
            }

            setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
            continue;
          }
        }

        try {
          const res = await uploadFunction(workingFile, uploadData);
          uploaded.push(res);
        } catch (e: any) {
          errors.push({ name: fileItem.file.name, error: e?.message || "Upload failed" });
        }

        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      const uploadedCount = selectedFiles.length - errors.length;
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} ${title}${uploadedCount > 1 ? "s" : ""} uploaded successfully!`);
      }

      if (errors.length > 0) {
        toast.error(`${errors.length} upload(s) failed`, {
          description: errors.slice(0, 3).map((e) => `${e.name}: ${e.error}`).join(" | "),
          duration: 8000,
        });
      }

      // Reset form
      setTimeout(() => {
        setSelectedFiles([]);
        setFormData({
          title: "",
          description: "",
          tags: "",
          publishStatus: "draft",
          folderId: "",
          scheduleDate: undefined,
          bannerType: "wallpaper",
          mediaType: "audio",
          youtubeUrl: "",
          artist: "",
          subtitle: "",
          content: "",
          author: "Admin",
        });
        setUploadProgress(0);
        onSuccess();
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <h3 className="text-xl font-semibold text-gray-800">Upload {title}</h3>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Upload */}
          {uploadType !== "media" || formData.mediaType !== "youtube" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {uploadType === "media" && formData.mediaType === "audio" ? "Audio File(s)" : ""}
                {uploadType === "media" && formData.mediaType === "video" ? "Video File(s)" : ""}
                {uploadType === "sparkle" ? "Sparkle Image or Video" : ""}
                {uploadType === "wallpaper" || uploadType === "banner" ? "Image or Video File(s)" : ""}
                {uploadType !== "media" && uploadType !== "sparkle" && uploadType !== "wallpaper" && uploadType !== "banner" ? "Image File(s)" : ""}
              </label>
              
              {/* File Grid Display */}
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                  {selectedFiles.map((fileItem) => (
                    <div key={fileItem.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                        {fileItem.preview ? (
                          fileItem.file.type.startsWith("video/") ? (
                            <video
                              src={fileItem.preview}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={fileItem.preview}
                              alt={fileItem.file.name}
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFile(fileItem.id)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-gray-600 mt-1 truncate">{fileItem.file.name}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
              >
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-600">
                    {isSparkleUpload
                      ? `Click to select sparkle media (up to ${maxFiles})`
                      : `Click to select ${selectedFiles.length > 0 ? "more " : ""}file(s)`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {uploadType === "media" && formData.mediaType === "audio"
                      ? "MP3, WAV (max 50MB each)"
                      : uploadType === "media" && formData.mediaType === "video"
                      ? "MP4, WebM (max 100MB each)"
                      : uploadType === "wallpaper" || uploadType === "banner"
                      ? "JPG, PNG, WebP, MP4, WebM (Images: max 50MB, Videos: max 100MB)"
                      : isSparkleUpload
                      ? "JPG, PNG, WebP (max 50MB) or MP4/WebM (max 200MB)"
                      : "JPG, PNG, WebP (max 50MB each)"}
                  </p>
                  {selectedFiles.length > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      {selectedFiles.length} file(s) selected
                    </p>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={
                  uploadType === "media" && formData.mediaType === "audio"
                    ? "audio/mp3,audio/mpeg,audio/wav"
                    : uploadType === "media" && formData.mediaType === "video"
                    ? "video/mp4,video/webm"
                    : uploadType === "wallpaper" || uploadType === "banner"
                    ? "image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm"
                    : isSparkleUpload
                    ? "image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm"
                    : "image/jpeg,image/jpg,image/png,image/webp"
                }
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : null}

          {/* Media Type Selector */}
          {uploadType === "media" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Media Type
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormData({ ...formData, mediaType: "audio" })}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    formData.mediaType === "audio"
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  🎵 Audio
                </button>
                <button
                  onClick={() => setFormData({ ...formData, mediaType: "video" })}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    formData.mediaType === "video"
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  🎬 Video
                </button>
                <button
                  onClick={() => setFormData({ ...formData, mediaType: "youtube" })}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    formData.mediaType === "youtube"
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  📺 YouTube
                </button>
              </div>
            </div>
          )}

          {/* YouTube URL */}
          {uploadType === "media" && formData.mediaType === "youtube" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL *
              </label>
              <input
                type="url"
                value={formData.youtubeUrl}
                onChange={(e) =>
                  setFormData({ ...formData, youtubeUrl: e.target.value })
                }
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title {uploadType !== "wallpaper" ? "*" : "(Optional - uses filename if empty)"}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={uploadType === "wallpaper" ? "Optional - will use filename if empty" : "Enter title"}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {uploadType === "wallpaper" && selectedFiles.length > 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use individual file names for each upload
              </p>
            )}
          </div>

          {/* Subtitle (Sparkle only) */}
          {uploadType === "sparkle" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) =>
                  setFormData({ ...formData, subtitle: e.target.value })
                }
                placeholder="Enter subtitle"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Artist (Media only) */}
          {uploadType === "media" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Artist
              </label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                placeholder="Enter artist name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter description"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Folder (Wallpaper, Banner, Media, Sparkle) */}
          {(uploadType === "wallpaper" || uploadType === "banner" || uploadType === "media" || uploadType === "sparkle") && folders && folders.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder (Optional)
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.folderId}
                  onChange={(e) => setFormData({ ...formData, folderId: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Uncategorized</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                {onCreateFolder && (
                  <button
                    onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    title="Create new folder"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* New Folder Creation */}
              {showNewFolderInput && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleCreateFolder();
                      }
                    }}
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFolderInput(false);
                      setNewFolderName("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Content (Sparkle only) */}
          {uploadType === "sparkle" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter article content"
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="murugan, temple, devotional"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Publish Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormData({ ...formData, publishStatus: "draft" })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  formData.publishStatus === "draft"
                    ? "border-yellow-600 bg-yellow-50 text-yellow-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setFormData({ ...formData, publishStatus: "published" })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  formData.publishStatus === "published"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                Publish Now
              </button>
              <button
                onClick={() => setFormData({ ...formData, publishStatus: "scheduled" })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  formData.publishStatus === "scheduled"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                Schedule
              </button>
            </div>
          </div>

          {/* Schedule Date Picker */}
          {formData.publishStatus === "scheduled" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Date & Time *
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 justify-start">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className={formData.scheduleDate ? "text-gray-900" : "text-gray-500"}>
                      {formData.scheduleDate
                        ? format(formData.scheduleDate, "PPP 'at' HH:mm")
                        : "Select date and time"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.scheduleDate}
                    onSelect={(date) => setFormData({ ...formData, scheduleDate: date })}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                  <div className="p-3 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(":");
                        const newDate = formData.scheduleDate || new Date();
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setFormData({ ...formData, scheduleDate: newDate });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading {selectedFiles.length} file(s)...</span>
                <span className="text-green-600 font-medium">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-3 z-10">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={
              isUploading ||
              selectedFiles.length === 0
            }
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {selectedFiles.length > 0 ? `${selectedFiles.length} ` : ""}
                {formData.publishStatus === "published" ? "& Publish" : formData.publishStatus === "scheduled" ? "& Schedule" : "as Draft"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
