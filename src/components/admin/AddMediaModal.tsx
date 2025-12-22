import { useState } from "react";
import {
  X,
  Music,
  Video,
  Youtube,
  Upload,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { MuruganLoader } from "../MuruganLoader";

type MediaType = "song" | "video";
type UploadMode = "youtube" | "file";

interface AddMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface YouTubeFetchResult {
  title: string;
  thumbnail_url: string;
  video_url: string;
  duration?: number;
}

export function AddMediaModal({ isOpen, onClose, onSuccess }: AddMediaModalProps) {
  const [activeTab, setActiveTab] = useState<MediaType>("song");
  const [uploadMode, setUploadMode] = useState<UploadMode>("youtube");
  
  // Form state
  const [title, setTitle] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [schedulePost, setSchedulePost] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  
  // File upload state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  
  // Fetch state
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedData, setFetchedData] = useState<YouTubeFetchResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const categories = [
    "Devotional",
    "Bhakti",
    "Arupadai Veedu",
    "Festival",
    "Tamil",
    "Sanskrit",
    "Temple",
  ];

  const selectedCategory = newCategory || category;

  if (!isOpen) return null;

  const handleFetchYouTube = async () => {
    if (!youtubeLink.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }

    setIsFetching(true);
    try {
      console.log("[AddMedia] Fetching YouTube metadata for:", youtubeLink);

      // ✅ FIX: Use clean URL - remove any "blob:" prefix if present
      const cleanUrl = youtubeLink.replace(/^blob:/, '').trim();
      
      // Call backend to fetch YouTube metadata
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/youtube/fetch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ youtubeUrl: cleanUrl }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch YouTube data");
      }

      const result = await response.json();

      if (result.success) {
        console.log("[AddMedia] YouTube metadata fetched:", result.data);
        setFetchedData({
          title: result.data.title,
          thumbnail_url: result.data.thumbnail_url,
          video_url: cleanUrl,
          duration: result.data.duration,
        });
        setTitle(result.data.title);
        setYoutubeLink(cleanUrl); // Update with clean URL
        toast.success("YouTube data fetched successfully!");
      } else {
        throw new Error(result.error || "Failed to fetch");
      }
    } catch (error: any) {
      console.error("[AddMedia] Fetch error:", error);
      toast.error(error.message || "Failed to fetch YouTube data");
    } finally {
      setIsFetching(false);
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }
    if (uploadMode === "youtube" && !youtubeLink.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    if (uploadMode === "file") {
      if (activeTab === "song" && !audioFile) {
        toast.error("Please upload an audio file");
        return;
      }
      if (activeTab === "video" && !videoFile) {
        toast.error("Please upload a video file");
        return;
      }
    }
    setIsUploading(true);
    try {
      const publishStatus = isDraft ? "draft" : schedulePost ? "scheduled" : "published";
      const scheduledAt =
        schedulePost && scheduleDate && scheduleTime
          ? `${scheduleDate}T${scheduleTime}`
          : "";

      const contentType = activeTab === "song" ? "audio" : "video";

      // STEP 2: Always use FormData for upload
      const formData = new FormData();
      formData.append("title", title);
      formData.append("category", selectedCategory);

      // Backend expects: publishStatus + optional scheduled_at
      formData.append("publishStatus", publishStatus);
      if (publishStatus === "scheduled" && scheduledAt) {
        formData.append("scheduled_at", scheduledAt);
      }

      if (uploadMode === "youtube") {
        // Backend expects: mediaType=youtube and contentType=audio|video
        formData.append("mediaType", "youtube");
        formData.append("contentType", contentType);
        formData.append("youtubeUrl", youtubeLink.trim());
        if (fetchedData?.thumbnail_url) formData.append("thumbnailUrl", fetchedData.thumbnail_url);
      } else {
        // Backend expects: mediaType=audio|video and file=<File>
        formData.append("mediaType", contentType);
        const file = activeTab === "song" ? audioFile : videoFile;
        if (file) {
          formData.append("file", file);
        }
        // Optional thumbnail file upload is not supported by backend yet; omit for now.
      }
      // Remove all outdated fields (type, uploadMode, etc.)
      // STEP 3: Send FormData to backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/upload/media`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            // Do NOT set Content-Type for FormData
          },
          body: formData,
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[AddMedia] Upload failed:", errorData);
        throw new Error(errorData.error || "Upload failed");
      }
      const result = await response.json();
      if (result.success) {
        toast.success(
          isDraft
            ? "Media saved as draft!"
            : schedulePost
            ? "Media scheduled successfully!"
            : "Media uploaded successfully!"
        );
        onSuccess();
        handleClose();
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error: any) {
      console.error("[AddMedia] Upload error:", error);
      toast.error(error.message || "Failed to upload media");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setTitle("");
    setYoutubeLink("");
    setCategory("");
    setNewCategory("");
    setIsDraft(false);
    setSchedulePost(false);
    setScheduleDate("");
    setScheduleTime("");
    setAudioFile(null);
    setVideoFile(null);
    setThumbnailFile(null);
    setFetchedData(null);
    setActiveTab("song");
    setUploadMode("youtube");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700">
          <h2 className="text-2xl font-bold text-white">Add Media</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Tabs: Songs | Videos */}
        <div className="flex gap-2 px-6 pt-6 bg-gray-50">
          <button
            onClick={() => setActiveTab("song")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-t-xl font-semibold transition-all ${
              activeTab === "song"
                ? "bg-white text-purple-700 shadow-sm"
                : "bg-transparent text-gray-600 hover:bg-white/50"
            }`}
          >
            <Music className="w-5 h-5" />
            Songs
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-t-xl font-semibold transition-all ${
              activeTab === "video"
                ? "bg-white text-purple-700 shadow-sm"
                : "bg-transparent text-gray-600 hover:bg-white/50"
            }`}
          >
            <Video className="w-5 h-5" />
            Videos
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Upload Mode Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Upload Method
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setUploadMode("youtube")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium transition-all ${
                  uploadMode === "youtube"
                    ? "border-purple-600 bg-purple-50 text-purple-700"
                    : "border-gray-300 text-gray-600 hover:border-purple-300"
                }`}
              >
                <Youtube className="w-5 h-5" />
                YouTube Link
              </button>
              <button
                onClick={() => setUploadMode("file")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium transition-all ${
                  uploadMode === "file"
                    ? "border-purple-600 bg-purple-50 text-purple-700"
                    : "border-gray-300 text-gray-600 hover:border-purple-300"
                }`}
              >
                <Upload className="w-5 h-5" />
                Upload File
              </button>
            </div>
          </div>

          {/* YouTube Mode */}
          {uploadMode === "youtube" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  YouTube Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={youtubeLink}
                    onChange={(e) => setYoutubeLink(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                  <button
                    onClick={handleFetchYouTube}
                    disabled={isFetching}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isFetching ? (
                      <MuruganLoader variant="button" />
                    ) : (
                      "Fetch"
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {activeTab === "song"
                    ? "We'll fetch metadata and convert to MP3 automatically"
                    : "We'll fetch the title, thumbnail, and embed URL"}
                </p>
              </div>

              {/* Preview Card */}
              {fetchedData && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border-2 border-purple-200">
                  <p className="text-xs font-semibold text-purple-700 mb-2">
                    PREVIEW
                  </p>
                  <div className="flex gap-4">
                    <img
                      src={fetchedData.thumbnail_url}
                      alt="Thumbnail"
                      className="w-32 h-20 object-cover rounded-lg shadow-sm"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 mb-1">
                        {fetchedData.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {fetchedData.video_url}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* File Upload Mode */}
          {uploadMode === "file" && (
            <>
              {/* Audio/Video File */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {activeTab === "song" ? "Audio File (MP3)" : "Video File (MP4)"}
                </label>
                <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept={activeTab === "song" ? "audio/mp3,audio/mpeg" : "video/mp4,video/mpeg"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (activeTab === "song") setAudioFile(file);
                        else setVideoFile(file);
                      }
                    }}
                    className="hidden"
                  />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">
                    {(activeTab === "song" ? audioFile : videoFile)?.name ||
                      "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activeTab === "song" ? "MP3 up to 50MB" : "MP4 up to 500MB"}
                  </p>
                </label>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Thumbnail Image
                </label>
                <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setThumbnailFile(file);
                    }}
                    className="hidden"
                  />
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">
                    {thumbnailFile?.name || "Upload thumbnail"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                </label>
              </div>
            </>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category
            </label>
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setNewCategory("");
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const newCat = prompt("Enter new category name:");
                  if (newCat) {
                    setNewCategory(newCat);
                    setCategory("");
                  }
                }}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                title="Create new category"
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {newCategory && (
              <p className="text-sm text-purple-600 mt-2">
                New category: <strong>{newCategory}</strong>
              </p>
            )}
          </div>

          {/* Draft & Schedule */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDraft}
                onChange={(e) => {
                  setIsDraft(e.target.checked);
                  if (e.target.checked) setSchedulePost(false);
                }}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Save as Draft
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={schedulePost}
                onChange={(e) => {
                  setSchedulePost(e.target.checked);
                  if (e.target.checked) setIsDraft(false);
                }}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Schedule Post
              </span>
            </label>

            {schedulePost && (
              <div className="ml-6 flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
          >
            {isUploading ? (
              <>
                <MuruganLoader variant="button" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}