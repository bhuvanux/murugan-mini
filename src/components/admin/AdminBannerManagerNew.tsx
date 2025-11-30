import React, { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { UploadModal } from "./UploadModal";
import { DatabaseSetupGuide } from "./DatabaseSetupGuide";
import { BannerDatabaseChecker } from "./BannerDatabaseChecker";
import * as adminAPI from "../../utils/adminAPI";

interface Banner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  publish_status: string;
  view_count: number;
  click_count: number;
  created_at: string;
}

export function AdminBannerManagerNew() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);

  // Load banners from backend
  const loadBanners = async () => {
    try {
      setIsLoading(true);
      console.log('[AdminBannerManager] Starting to load banners...');
      
      const result = await adminAPI.getBanners(
        filter !== "all" ? { publishStatus: filter } : undefined
      );
      
      console.log("[AdminBannerManager] Loaded banners:", result);
      setBanners(result.data || []);
      
      if (result.data?.length === 0) {
        toast.info("No banners found. Upload your first banner!");
      } else {
        toast.success(`Loaded ${result.data.length} banners`);
      }
      
      // Hide database setup if data loaded successfully
      setShowDatabaseSetup(false);
    } catch (error: any) {
      console.error("[AdminBannerManager] Load error:", error);
      
      // Show database setup guide if error indicates missing tables
      if (
        error.message.includes("Failed to fetch") || 
        error.message.includes("500") || 
        error.message.includes("relation") ||
        error.message.includes("schema cache") ||
        error.message.includes("Could not find the table")
      ) {
        setShowDatabaseSetup(true);
      }
      
      // Show detailed error message
      const errorMessage = error.message || "Failed to load banners";
      toast.error("Database tables not found", {
        duration: 8000,
        description: "Please follow the setup guide above to create the database tables.",
      });
      
      // Set empty array so UI doesn't break
      setBanners([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, [filter]);

  const handleTogglePublish = async (banner: Banner) => {
    try {
      const newStatus = banner.publish_status === "published" ? "draft" : "published";
      
      await adminAPI.updateBanner(banner.id, {
        publish_status: newStatus,
      });

      toast.success(`Banner ${newStatus === "published" ? "published" : "unpublished"}`);
      loadBanners();
    } catch (error: any) {
      toast.error("Failed to update banner: " + error.message);
    }
  };

  const handleDelete = async (banner: Banner) => {
    if (!confirm(`Delete "${banner.title}"?`)) return;

    try {
      await adminAPI.deleteBanner(banner.id);
      toast.success("Banner deleted");
      loadBanners();
    } catch (error: any) {
      toast.error("Failed to delete banner: " + error.message);
    }
  };

  return (
    <div className="space-y-6 text-inter-regular-14">
      {/* Database Setup Guide - Show prominently at top when tables missing */}
      {showDatabaseSetup && <DatabaseSetupGuide />}

      {/* Database Checker - Shows exactly what's in the banners table */}
      <BannerDatabaseChecker />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-inter-bold-20 text-gray-800">Banner Management</h2>
          <p className="text-gray-500 mt-1 text-inter-regular-14">
            Manage carousel banners for the user app
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadBanners}
            disabled={isLoading}
            className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            disabled={showDatabaseSetup}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-medium text-inter-medium-16 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Upload Banner
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-gray-500 text-sm text-inter-regular-14">Total Banners</p>
          <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
            {banners.length}
          </p>
          <p className="text-sm text-green-600 mt-1 text-inter-regular-14">
            {banners.filter((b) => b.publish_status === "published").length} published
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-gray-500 text-sm text-inter-regular-14">Total Views</p>
          <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
            {banners.reduce((sum, b) => sum + (b.view_count || 0), 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-gray-500 text-sm text-inter-regular-14">Total Clicks</p>
          <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
            {banners.reduce((sum, b) => sum + (b.click_count || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-2 px-4 rounded text-inter-medium-16 transition-all ${
            filter === "all"
              ? "bg-green-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          All ({banners.length})
        </button>
        <button
          onClick={() => setFilter("published")}
          className={`flex-1 py-2 px-4 rounded text-inter-medium-16 transition-all ${
            filter === "published"
              ? "bg-green-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Published
        </button>
        <button
          onClick={() => setFilter("draft")}
          className={`flex-1 py-2 px-4 rounded text-inter-medium-16 transition-all ${
            filter === "draft"
              ? "bg-green-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Drafts
        </button>
      </div>

      {/* Banners Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
            <p className="text-gray-600 text-inter-regular-14">Loading banners...</p>
          </div>
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-800 mb-2 text-inter-semibold-18">No banners yet</h3>
          <p className="text-gray-500 mb-4 text-inter-regular-14">
            Upload your first banner to get started
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16"
          >
            Upload Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="relative aspect-[16/9] bg-gray-100">
                <img
                  src={banner.thumbnail_url || banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium text-inter-medium-16 ${
                      banner.publish_status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {banner.publish_status}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-inter-semibold-18">
                  {banner.title}
                </h3>
                {banner.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2 text-inter-regular-14">
                    {banner.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 text-inter-regular-14">Views</p>
                    <p className="font-semibold text-gray-800 text-inter-medium-16">
                      {banner.view_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 text-inter-regular-14">Clicks</p>
                    <p className="font-semibold text-gray-800 text-inter-medium-16">
                      {banner.click_count || 0}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3 text-inter-regular-14">
                  Created {new Date(banner.created_at).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePublish(banner)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-colors text-inter-medium-16 ${
                      banner.publish_status === "published"
                        ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        : "border-green-300 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {banner.publish_status === "published" ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Publish
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(banner)}
                    className="p-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={loadBanners}
        title="Banner"
        uploadType="banner"
        uploadFunction={adminAPI.uploadBanner}
      />
    </div>
  );
}