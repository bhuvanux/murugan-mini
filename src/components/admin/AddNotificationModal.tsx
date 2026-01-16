import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Loader2, Calendar, Bell, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import * as adminAPI from "../../utils/adminAPI";

interface AddNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingNotification?: any;
}

type NotificationType = "push" | "banner" | "fullscreen_banner";

export function AddNotificationModal({
    isOpen,
    onClose,
    onSuccess,
    editingNotification,
}: AddNotificationModalProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form fields
    const [notificationType, setNotificationType] = useState<NotificationType>("banner");
    const [formData, setFormData] = useState({
        title: "",
        shortDescription: "",
        messageContent: "",
        navigationUrl: "",
        buttonText: "View",
        targetAudience: "all_users",
        status: "draft" as "draft" | "scheduled" | "sent",
        scheduleDate: undefined as Date | undefined,
    });

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");

    // Reset form
    const resetForm = () => {
        setNotificationType("banner");
        setFormData({
            title: "",
            shortDescription: "",
            messageContent: "",
            navigationUrl: "",
            buttonText: "View",
            targetAudience: "all_users",
            status: "draft",
            scheduleDate: undefined,
        });
        setSelectedImage(null);
        setImagePreview("");
        setUploadProgress(0);
    };

    // Load existing notification
    useEffect(() => {
        if (editingNotification) {
            setNotificationType(editingNotification.display_type || "banner");
            setFormData({
                title: editingNotification.title || "",
                shortDescription: editingNotification.short_description || "",
                messageContent: editingNotification.message_content || "",
                navigationUrl: editingNotification.navigation_url || "",
                buttonText: editingNotification.button_text || "View",
                targetAudience: editingNotification.target_audience || "all_users",
                status: editingNotification.status || "draft",
                scheduleDate: editingNotification.scheduled_at ? new Date(editingNotification.scheduled_at) : undefined,
            });
            setImagePreview(editingNotification.image_url || "");
        } else {
            resetForm();
        }
    }, [editingNotification]);

    // Handle image selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        // For fullscreen banner, check aspect ratio
        if (notificationType === "fullscreen_banner") {
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                const targetRatio = 9 / 16;
                if (Math.abs(ratio - targetRatio) > 0.1) {
                    toast.error("Please upload an image with 9:16 aspect ratio (e.g., 1080x1920)");
                    return;
                }
                setSelectedImage(file);
                setImagePreview(URL.createObjectURL(file));
            };
            img.src = URL.createObjectURL(file);
        } else {
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // Handle submit
    const handleSubmit = async () => {
        // Validation
        if (!formData.title.trim()) {
            toast.error("Please enter a notification title");
            return;
        }
        // Message content only required for push and banner types
        if (notificationType !== "fullscreen_banner" && !formData.messageContent.trim()) {
            toast.error("Please enter message content");
            return;
        }
        if (notificationType === "fullscreen_banner" && !selectedImage && !imagePreview) {
            toast.error("Fullscreen banner requires an image");
            return;
        }
        if (formData.status === "scheduled" && !formData.scheduleDate) {
            toast.error("Please select a schedule date");
            return;
        }

        setIsUploading(true);
        setUploadProgress(10);

        try {
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => Math.min(prev + 10, 90));
            }, 200);

            const notificationData: any = {
                title: formData.title,
                display_type: notificationType,
                navigation_url: formData.navigationUrl,
                target_audience: formData.targetAudience,
                status: formData.status,
                scheduled_at: formData.scheduleDate ? formData.scheduleDate.toISOString() : null,
            };

            // Only include message content and short description for non-fullscreen types
            if (notificationType !== "fullscreen_banner") {
                notificationData.short_description = formData.shortDescription;
                notificationData.message_content = formData.messageContent;
            }

            // Only include button text for banner type
            if (notificationType === "banner") {
                notificationData.button_text = formData.buttonText;
            }

            let response;
            if (editingNotification) {
                if (selectedImage) {
                    response = await adminAPI.uploadNotification(selectedImage, {
                        ...notificationData,
                        id: editingNotification.id,
                    });
                } else {
                    response = await adminAPI.updateNotification(editingNotification.id, notificationData);
                }
            } else {
                if (selectedImage) {
                    response = await adminAPI.uploadNotification(selectedImage, notificationData);
                } else {
                    response = await adminAPI.createNotification(notificationData);
                }
            }

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.success) {
                const notificationId = response.data?.id;

                // If status is 'sent', trigger the actual push notification send API
                if (formData.status === 'sent' && notificationId) {
                    console.log("[AddNotification] Triggering immediate send for:", notificationId);
                    await adminAPI.sendNotification(notificationId);
                }

                toast.success(editingNotification ? "Notification updated!" : "Notification created!");
                setTimeout(() => {
                    resetForm();
                    onSuccess();
                    onClose();
                }, 500);
            } else {
                throw new Error(response.error || "Failed to save notification");
            }
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(error.message || "Failed to save notification");
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">
                            {editingNotification ? "Edit Notification" : "Create Notification"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Choose notification type and configure settings
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isUploading}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Two Column Layout */}
                <div className="p-6 grid grid-cols-2 gap-6">
                    {/* Left Column - Form */}
                    <div className="space-y-6">
                        {/* Notification Type Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Notification Type *
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setNotificationType("push")}
                                    className={`py-3 px-4 rounded-lg border-2 transition-all text-sm font-medium ${notificationType === "push"
                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <Bell className="w-5 h-5" />
                                        <span>Push</span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNotificationType("banner")}
                                    className={`py-3 px-4 rounded-lg border-2 transition-all text-sm font-medium ${notificationType === "banner"
                                        ? "border-green-600 bg-green-50 text-green-700"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="text-xs">📱</div>
                                        <span>Banner</span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNotificationType("fullscreen_banner")}
                                    className={`py-3 px-4 rounded-lg border-2 transition-all text-sm font-medium ${notificationType === "fullscreen_banner"
                                        ? "border-purple-600 bg-purple-50 text-purple-700"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="text-xs">📺</div>
                                        <span>Fullscreen</span>
                                    </div>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {notificationType === "push" && "Android native notification (appears in notification tray)"}
                                {notificationType === "banner" && "Small top banner with button inside the app"}
                                {notificationType === "fullscreen_banner" && "Full-screen 9:16 vertical banner image"}
                            </p>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., New Wallpapers Added!"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                maxLength={50}
                            />
                            <p className="text-xs text-gray-500 mt-1">{formData.title.length}/50 characters</p>
                        </div>

                        {/* Short Description - Not for fullscreen */}
                        {notificationType !== "fullscreen_banner" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Short Description
                                </label>
                                <input
                                    type="text"
                                    value={formData.shortDescription}
                                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                                    placeholder="Brief preview text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    maxLength={100}
                                />
                            </div>
                        )}

                        {/* Message Content - Not for fullscreen */}
                        {notificationType !== "fullscreen_banner" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Message *
                                </label>
                                <textarea
                                    value={formData.messageContent}
                                    onChange={(e) => setFormData({ ...formData, messageContent: e.target.value })}
                                    placeholder="Enter the full notification message..."
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                />
                            </div>
                        )}

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Image {notificationType === "fullscreen_banner" ? "*" : "(Optional)"}
                            </label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 transition-colors"
                            >
                                {imagePreview ? (
                                    <div className="space-y-2">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className={`mx-auto rounded-lg ${notificationType === "fullscreen_banner"
                                                ? "h-48 w-auto"
                                                : "w-full h-32 object-cover"
                                                }`}
                                        />
                                        <p className="text-sm text-green-600">Click to change image</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                                        <p className="text-gray-600">Click to upload image</p>
                                        <p className="text-xs text-gray-400">
                                            {notificationType === "fullscreen_banner"
                                                ? "Required: 9:16 aspect ratio (e.g., 1080x1920px)"
                                                : "Recommended: 1024x512px - Max 5MB"}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                        </div>

                        {/* Navigation URL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Navigation URL (Optional)
                            </label>
                            <input
                                type="text"
                                value={formData.navigationUrl}
                                onChange={(e) => setFormData({ ...formData, navigationUrl: e.target.value })}
                                placeholder="e.g., /wallpapers or https://example.com"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>

                        {/* Button Text - Only for banner */}
                        {notificationType === "banner" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Button Text
                                </label>
                                <input
                                    type="text"
                                    value={formData.buttonText}
                                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                                    placeholder="e.g., View Now"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    maxLength={20}
                                />
                            </div>
                        )}

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setFormData({ ...formData, status: "draft" })}
                                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${formData.status === "draft"
                                        ? "border-yellow-600 bg-yellow-50 text-yellow-700"
                                        : "border-gray-200 text-gray-600"
                                        }`}
                                >
                                    Draft
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, status: "scheduled" })}
                                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${formData.status === "scheduled"
                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                        : "border-gray-200 text-gray-600"
                                        }`}
                                >
                                    Schedule
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, status: "sent" })}
                                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${formData.status === "sent"
                                        ? "border-green-600 bg-green-50 text-green-700"
                                        : "border-gray-200 text-gray-600"
                                        }`}
                                    disabled={editingNotification?.status === "sent"}
                                >
                                    Send Now
                                </button>
                            </div>
                        </div>

                        {/* Schedule Date */}
                        {formData.status === "scheduled" && (
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
                                                    if (!e.target.value) return;
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
                                    <span className="text-gray-600">Uploading...</span>
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

                    {/* Right Column - Live Preview */}
                    <div className="space-y-4">
                        <div className="sticky top-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                Live Preview
                            </h4>

                            {/* Preview based on type */}
                            <div className="bg-gradient-to-b from-gray-100 to-gray-200 rounded-3xl p-4 shadow-lg">
                                <div className="bg-white rounded-2xl overflow-hidden shadow-md" style={{ height: "600px" }}>
                                    {/* Push Notification Preview */}
                                    {notificationType === "push" && (
                                        <div className="p-4">
                                            <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <Bell className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-gray-900">
                                                            Tamil Kadavul Murugan
                                                        </p>
                                                        <p className="text-sm font-medium text-gray-900 mt-1">
                                                            {formData.title || "Notification Title"}
                                                        </p>
                                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                            {formData.shortDescription || formData.messageContent || "Notification message"}
                                                        </p>
                                                        {imagePreview && (
                                                            <img
                                                                src={imagePreview}
                                                                alt="Notification"
                                                                className="w-full h-32 object-cover rounded mt-2"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Banner Notification Preview */}
                                    {notificationType === "banner" && (
                                        <div className="p-4">
                                            <div style={{ backgroundColor: "#121212" }} className="rounded-lg p-4 flex items-start gap-3">
                                                {imagePreview && (
                                                    <img
                                                        src={imagePreview}
                                                        alt="Banner"
                                                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-white font-semibold text-sm mb-1">
                                                        {formData.title || "Banner Title"}
                                                    </h3>
                                                    {formData.shortDescription && (
                                                        <p className="text-gray-300 text-xs mb-2 line-clamp-2">
                                                            {formData.shortDescription}
                                                        </p>
                                                    )}
                                                    {formData.buttonText && (
                                                        <button className="mt-2 px-4 py-1.5 bg-white text-black rounded text-xs font-medium">
                                                            {formData.buttonText}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Fullscreen Banner Preview */}
                                    {notificationType === "fullscreen_banner" && (
                                        <div className="flex items-center justify-center h-full bg-black/80 p-4">
                                            {imagePreview ? (
                                                <div className="relative" style={{ aspectRatio: "9/16", maxHeight: "550px" }}>
                                                    <img
                                                        src={imagePreview}
                                                        alt="Fullscreen Banner"
                                                        className="w-full h-full object-cover rounded-lg shadow-2xl"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-400">
                                                    <p className="text-sm">Upload a 9:16 image</p>
                                                    <p className="text-xs mt-1">to see preview</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
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
                        onClick={handleSubmit}
                        disabled={isUploading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>{editingNotification ? "Update Notification" : "Create Notification"}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
