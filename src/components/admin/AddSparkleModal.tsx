import React, { useState, useRef } from "react";
import { X, Upload, Loader2, CheckCircle, FolderPlus, Calendar, Video } from "lucide-react";
import { toast } from "sonner";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { generateVideoThumbnail } from "../../utils/videoHelper";
import { compressImage } from "../../utils/compressionHelper";
import * as adminAPI from "../../utils/adminAPI";
import { supabase } from "../../utils/supabase/client";

interface AddSparkleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (status?: string) => void;
    folders?: Array<{ id: string; name: string }>;
    onCreateFolder?: (name: string, description?: string) => Promise<void>;
}

interface FileItem {
    file: File;
    preview: string | null;
    id: string;
    thumbnail?: File;
}

export function AddSparkleModal({
    isOpen,
    onClose,
    onSuccess,
    folders = [],
    onCreateFolder,
}: AddSparkleModalProps) {
    const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    // Form fields
    const [formData, setFormData] = useState({
        title: "", // Optional for bulk uploads
        description: "", // Maps to 'content'
        tags: "",
        publishStatus: "draft" as "draft" | "published" | "scheduled",
        folderId: "",
        scheduleDate: undefined as Date | undefined,
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newFiles: FileItem[] = [];

        // Process files sequentially to generate thumbnails
        for (const file of files) {
            // Validate file size (max 500MB for videos)
            if (file.size > 500 * 1024 * 1024) {
                toast.error(`${file.name}: File size must be less than 500MB`);
                continue;
            }

            // Check type - accept both images and videos
            if (!file.type.startsWith("video/") && !file.type.startsWith("image/")) {
                toast.error(`${file.name}: Only image and video files are allowed`);
                continue;
            }

            const fileItem: FileItem = {
                file,
                preview: URL.createObjectURL(file),
                id: Math.random().toString(36).substring(7),
            };

            // Generate thumbnail only for videos
            if (file.type.startsWith("video/")) {
                try {
                    const thumbnail = await generateVideoThumbnail(file);
                    fileItem.thumbnail = thumbnail;
                } catch (error) {
                    console.warn("Failed to generate thumbnail for", file.name);
                }
            }

            newFiles.push(fileItem);
        }

        setSelectedFiles((prev) => [...prev, ...newFiles]);

        // Reset file input
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
        if (selectedFiles.length === 0) {
            toast.error("Please select at least one sparkle video");
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
            }, 500);

            // Upload all files
            const uploadPromises = selectedFiles.map(async (fileItem) => {
                let fileToUpload = fileItem.file;
                const originalSize = fileItem.file.size;
                let optimizedSize = fileItem.file.size;

                // Compress image files using compression engine
                if (fileItem.file.type.startsWith("image/")) {
                    try {
                        const result = await compressImage(fileItem.file);
                        fileToUpload = result.file;
                        optimizedSize = result.optimizedSize;
                        console.log(`[Sparkle Upload] Compressed ${fileItem.file.name}: ${(originalSize / 1024).toFixed(2)}KB → ${(optimizedSize / 1024).toFixed(2)}KB`);
                    } catch (error) {
                        console.error("Compression failed for", fileItem.file.name, error);
                        toast.error(`Optimization failed for ${fileItem.file.name}. Uploading original.`);
                    }
                }

                // Use thumbnail if generated (for videos)
                const thumbnailFile = fileItem.thumbnail;

                // Upload Thumbnail First (Robustness Fix)
                let thumbnailUrl = "";
                if (thumbnailFile) {
                    try {
                        const thumbData = {
                            title: `THUMB_${fileToUpload.name}`,
                            description: "Sparkle Thumbnail Artifact",
                            publishStatus: "published",
                            folder_id: null
                        };
                        const thumbResponse = await adminAPI.uploadWallpaper(thumbnailFile, thumbData);
                        if (thumbResponse.success && thumbResponse.data) {
                            const record = Array.isArray(thumbResponse.data) ? thumbResponse.data[0] : thumbResponse.data;
                            thumbnailUrl = record.image_url || record.url || record.file_url;
                        }
                    } catch (e) {
                        console.warn("Thumbnail upload failed", e);
                    }
                }

                const uploadData: any = {
                    // Use file name as title if global title is not provided
                    title: formData.title || "", // Don't default to filename
                    description: formData.description, // Maps to 'content' for Sparkles? No, DB has 'content' col.
                    content: formData.description, // Mapping description to content
                    subtitle: "", // Empty for now
                    tags: formData.tags,
                    publish_status: formData.publishStatus,
                    folder_id: formData.folderId || undefined,
                    scheduled_at: formData.scheduleDate ? formData.scheduleDate.toISOString() : undefined,
                    original_size_bytes: originalSize,
                    optimized_size_bytes: optimizedSize,
                    thumbnail_url: thumbnailUrl, // Pass the pre-uploaded URL
                    metadata: {
                        original_size: originalSize,
                        optimized_size: optimizedSize,
                        compression_ratio: originalSize > 0 ? (1 - optimizedSize / originalSize).toFixed(2) : "0",
                        is_compressed: fileItem.file.type.startsWith("image/"),
                        mime_type: fileToUpload.type,
                        duration: 0 // We could get duration from video element but keeping it simple
                    }
                };

                // If thumbnail upload failed or wasn't done, we can try passing the file to uploadSparkle
                // But api-routes.tsx uploadSparkle expects 'thumbnail' in formData. 
                // Let's pass it just in case.
                if (thumbnailFile && !thumbnailUrl) {
                    uploadData.thumbnail = thumbnailFile;
                }

                return adminAPI.uploadSparkle(fileToUpload, uploadData);
            });

            await Promise.all(uploadPromises);

            clearInterval(progressInterval);
            setUploadProgress(100);

            const uploadedCount = selectedFiles.length;
            toast.success(`${uploadedCount} sparkle${uploadedCount > 1 ? "s" : ""} uploaded successfully!`);

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
                });
                setUploadProgress(0);
                onSuccess(formData.publishStatus);
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800">Upload Sparkles</h3>
                        {selectedFiles.length === 1 && (
                            <p className="text-sm text-gray-500 mt-1 truncate max-w-md">{selectedFiles[0].file.name}</p>
                        )}
                        {selectedFiles.length > 1 && (
                            <p className="text-sm text-gray-500 mt-1">{selectedFiles.length} files selected</p>
                        )}
                    </div>
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Photo/Video File(s)
                        </label>

                        {/* File Grid Display */}
                        {selectedFiles.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                                {selectedFiles.map((fileItem) => (
                                    <div key={fileItem.id} className="relative group">
                                        <div className="aspect-[9/16] rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                                            {fileItem.preview ? (
                                                fileItem.file.type.startsWith("image/") ? (
                                                    <img
                                                        src={fileItem.preview}
                                                        alt={fileItem.file.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <video
                                                        src={fileItem.preview}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        onMouseOver={event => (event.target as HTMLVideoElement).play()}
                                                        onMouseOut={event => (event.target as HTMLVideoElement).pause()}
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
                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <p className="text-xs text-gray-600 mt-1 truncate">{fileItem.file.name}</p>
                                        {fileItem.thumbnail && <p className="text-[10px] text-green-600">Thumbnail Ready</p>}
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
                                <Video className="w-12 h-12 text-gray-400 mx-auto" />
                                <p className="text-gray-600">Click to select {selectedFiles.length > 0 ? "more " : ""}photo(s)/video(s)</p>
                                <p className="text-xs text-gray-400">
                                    Images (JPG, PNG, WebP) or Videos (MP4, WebM) - max 500MB each
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
                            accept="video/mp4,video/webm,image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Title (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Leave empty to use filename(s)"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description / Content
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            placeholder="Enter content description"
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Folder */}
                    {folders && folders.length > 0 && (
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

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tags (comma-separated)
                        </label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="kavadi, pooja, devotional"
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
                                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${formData.publishStatus === "draft"
                                    ? "border-yellow-600 bg-yellow-50 text-yellow-700"
                                    : "border-gray-200 text-gray-600"
                                    }`}
                            >
                                Draft
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, publishStatus: "published" })}
                                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${formData.publishStatus === "published"
                                    ? "border-green-600 bg-green-50 text-green-700"
                                    : "border-gray-200 text-gray-600"
                                    }`}
                            >
                                Publish Now
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, publishStatus: "scheduled" })}
                                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${formData.publishStatus === "scheduled"
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
                        disabled={isUploading || selectedFiles.length === 0}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            "Upload Sparkles"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
