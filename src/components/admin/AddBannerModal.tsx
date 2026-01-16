import React, { useState, useRef } from "react";
import { X, Upload, Loader2, CheckCircle, FolderPlus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { compressImage } from "../../utils/compressionHelper";
import * as adminAPI from "../../utils/adminAPI";
import { invalidateBannerCache } from "../../utils/bannerAPI";

interface AddBannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    folders?: Array<{ id: string; name: string }>;
    onCreateFolder?: (name: string, description?: string) => Promise<void>;
}

interface FileItem {
    file: File;
    preview: string | null;
    id: string;
}

export function AddBannerModal({
    isOpen,
    onClose,
    onSuccess,
    folders = [],
    onCreateFolder,
}: AddBannerModalProps) {
    const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    // Form fields
    const [formData, setFormData] = useState({
        title: "", // Optional for bulk uploads
        description: "",
        tags: "",
        publishStatus: "draft" as "draft" | "published" | "scheduled",
        folderId: "",
        scheduleDate: undefined as Date | undefined,

        // Banner Specifics
        bannerType: "wallpaper" as "wallpaper" | "home" | "media" | "sparkle",
        displayOrientation: "horizontal" as "horizontal" | "vertical",
        isWelcomeBanner: false,
        targetUrl: "",
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newFiles: FileItem[] = [];

        files.forEach((file) => {
            // Validate file size (max 50MB for images)
            if (file.size > 50 * 1024 * 1024) {
                toast.error(`${file.name}: File size must be less than 50MB`);
                return;
            }

            // Check type
            if (!file.type.startsWith("image/")) {
                toast.error(`${file.name}: Only image files are allowed`);
                return;
            }

            const fileItem: FileItem = {
                file,
                preview: null,
                id: Math.random().toString(36).substring(7),
            };

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                fileItem.preview = reader.result as string;
                setSelectedFiles((prev) => [...prev.filter(f => f.id !== fileItem.id), fileItem]);
            };
            reader.readAsDataURL(file);

            newFiles.push(fileItem);
        });

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
            toast.error("Please select at least one banner image");
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

            // Upload all files
            const uploadPromises = selectedFiles.map(async (fileItem) => {
                let fileToUpload = fileItem.file;
                let originalSize = fileItem.file.size;
                let optimizedSize = fileItem.file.size;

                try {
                    // Compress image
                    const result = await compressImage(fileItem.file);
                    fileToUpload = result.file;
                    originalSize = result.originalSize;
                    optimizedSize = result.optimizedSize;
                } catch (error) {
                    console.error("Compression failed for", fileItem.file.name, error);
                    toast.error(`Optimization failed for ${fileItem.file.name}. Uploading original.`);
                }

                const uploadData: any = {
                    // Use file name as title if global title is not provided
                    title: formData.title || fileToUpload.name.replace(/\.[^/.]+$/, ""),
                    description: formData.description,
                    tags: formData.tags,
                    publishStatus: formData.publishStatus,
                    folder_id: formData.folderId || undefined,
                    scheduled_at: formData.scheduleDate ? formData.scheduleDate.toISOString() : undefined,
                    original_size_bytes: originalSize,
                    optimized_size_bytes: optimizedSize,
                    metadata: {
                        original_size: originalSize,
                        optimized_size: optimizedSize,
                        compression_ratio: originalSize > 0 ? (1 - optimizedSize / originalSize).toFixed(2) : "0",
                        is_compressed: true,
                    },
                    // Banner specifics
                    bannerType: formData.bannerType,
                    displayOrientation: formData.displayOrientation,
                    isWelcomeBanner: formData.isWelcomeBanner,
                    target_url: formData.targetUrl
                };

                return adminAPI.uploadBanner(fileToUpload, uploadData);
            });

            await Promise.all(uploadPromises);

            // Invalidate banner cache so changes are reflected immediately
            console.log('[AddBannerModal] Invalidating banner cache after upload...');
            invalidateBannerCache();

            clearInterval(progressInterval);
            setUploadProgress(100);

            const uploadedCount = selectedFiles.length;
            toast.success(`${uploadedCount} banner${uploadedCount > 1 ? "s" : ""} uploaded successfully!`);

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
                    displayOrientation: "horizontal",
                    isWelcomeBanner: false,
                    targetUrl: ""
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                    <h3 className="text-xl font-semibold text-gray-800">Upload Banners</h3>
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
                            Banner Image(s)
                        </label>

                        {/* File Grid Display */}
                        {selectedFiles.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                                {selectedFiles.map((fileItem) => (
                                    <div key={fileItem.id} className="relative group">
                                        <div className="aspect-[3/1] rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                                            {fileItem.preview ? (
                                                <img
                                                    src={fileItem.preview}
                                                    alt={fileItem.file.name}
                                                    className="w-full h-full object-cover"
                                                />
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
                                <p className="text-gray-600">Click to select {selectedFiles.length > 0 ? "more " : ""}file(s)</p>
                                <p className="text-xs text-gray-400">
                                    JPG, PNG, WebP (max 50MB each)
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
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Banner Settings */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                        <h4 className="font-medium text-gray-900">Banner Settings</h4>

                        {/* Display Orientation */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Display Orientation
                            </label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({
                                        ...formData,
                                        displayOrientation: "horizontal",
                                        isWelcomeBanner: true // Horizontal -> Overlay (Welcome)
                                    })}
                                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${formData.displayOrientation === "horizontal"
                                        ? "border-green-600 bg-green-50 text-green-700 font-medium shadow-sm"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        }`}
                                >
                                    <span className="text-lg">📱</span>
                                    <span>Horizontal</span>
                                    <span className="text-xs opacity-80 font-normal">(App Open Overlay)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({
                                        ...formData,
                                        displayOrientation: "vertical",
                                        isWelcomeBanner: false // Vertical -> Feed Carousel
                                    })}
                                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${formData.displayOrientation === "vertical"
                                        ? "border-green-600 bg-green-50 text-green-700 font-medium shadow-sm"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        }`}
                                >
                                    <span className="text-lg">🎯</span>
                                    <span>Vertical</span>
                                    <span className="text-xs opacity-80 font-normal">(Feed Carousel)</span>
                                </button>
                            </div>
                        </div>

                        {/* Welcome Banner Toggle */}
                        <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                            <input
                                type="checkbox"
                                id="welcomeBanner"
                                checked={formData.isWelcomeBanner}
                                onChange={(e) => setFormData({ ...formData, isWelcomeBanner: e.target.checked })}
                                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <label htmlFor="welcomeBanner" className="flex-1 cursor-pointer">
                                <span className="text-sm font-semibold text-gray-900">Welcome Banner for New Users</span>
                                <p className="text-xs text-gray-600 mt-0.5">
                                    Show this banner to first-time users only (can be dismissed)
                                </p>
                            </label>
                        </div>
                    </div>

                    {/* Link URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Target URL (Optional)
                        </label>
                        <input
                            type="url"
                            value={formData.targetUrl}
                            onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                            placeholder="promotion, new, event"
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
                            "Upload Banners"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
