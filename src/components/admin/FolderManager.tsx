import React, { useState } from "react";
import { Folder, Plus, Edit2, Trash2, FolderPlus, X } from "lucide-react";
import { toast } from "sonner";

export interface WallpaperFolder {
  id: string;
  name: string;
  description?: string;
  wallpaper_count: number;
  created_at: string;
  updated_at: string;
}

export interface GenericFolder {
  id: string;
  name: string;
  description?: string;
  wallpaper_count?: number;
  banner_count?: number;
  media_count?: number;
  sparkle_count?: number;
  created_at: string;
  updated_at?: string;
}

interface FolderManagerProps {
  folders: GenericFolder[];
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, description?: string) => Promise<void>;
  onUpdateFolder: (folderId: string, name: string, description?: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onRefresh?: () => void;
  allWallpapersCount?: number;
  uncategorizedCount?: number;
  contentType?: "wallpaper" | "banner" | "media" | "sparkle";
}

export function FolderManager({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onRefresh,
  allWallpapersCount = 0,
  uncategorizedCount = 0,
  contentType = "wallpaper",
}: FolderManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<GenericFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  
  // Get content type labels
  const contentLabel = contentType === "banner" ? "Banner" : contentType === "media" ? "Media" : contentType === "sparkle" ? "Sparkle" : "Wallpaper";
  const contentLabelPlural = contentLabel + "s";

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast.error("Folder name is required");
      return;
    }

    try {
      await onCreateFolder(folderName, folderDescription);
      setShowCreateModal(false);
      setFolderName("");
      setFolderDescription("");
      toast.success("Folder created successfully");
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error("Failed to create folder: " + error.message);
    }
  };

  const handleEdit = async () => {
    if (!editingFolder || !folderName.trim()) {
      toast.error("Folder name is required");
      return;
    }

    try {
      await onUpdateFolder(editingFolder.id, folderName, folderDescription);
      setShowEditModal(false);
      setEditingFolder(null);
      setFolderName("");
      setFolderDescription("");
      toast.success("Folder updated successfully");
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error("Failed to update folder: " + error.message);
    }
  };

  const handleDelete = async (folder: GenericFolder) => {
    const itemCount = folder.wallpaper_count || folder.banner_count || folder.media_count || folder.sparkle_count || 0;
    
    if (itemCount > 0) {
      if (!confirm(`This folder contains ${itemCount} ${contentLabel.toLowerCase()}(s). ${contentLabelPlural} will be moved to "Uncategorized". Continue?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete folder "${folder.name}"?`)) {
        return;
      }
    }

    try {
      await onDeleteFolder(folder.id);
      toast.success("Folder deleted");
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error("Failed to delete folder: " + error.message);
    }
  };

  const openEditModal = (folder: GenericFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description || "");
    setShowEditModal(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-gray-900 flex items-center gap-2">
          <Folder className="w-5 h-5 text-[#0d5e38]" />
          Folders
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[#0d5e38] text-white rounded-xl hover:bg-[#0a4a2b] transition-colors text-sm"
        >
          <FolderPlus className="w-4 h-4" />
          New Folder
        </button>
      </div>

      {/* Folder List */}
      <div className="space-y-2">
        {/* All Items */}
        <button
          onClick={() => onSelectFolder(null)}
          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
            selectedFolder === null
              ? "bg-[#0d5e38] text-white"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <Folder className="w-4 h-4" />
            <span className="text-sm">All {contentLabelPlural}</span>
          </div>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">
            {allWallpapersCount}
          </span>
        </button>

        {/* User Folders */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`flex items-center gap-2 p-3 rounded-xl transition-all ${
              selectedFolder === folder.id
                ? "bg-[#0d5e38] text-white"
                : "bg-gray-50 text-gray-700"
            }`}
          >
            <button
              onClick={() => onSelectFolder(folder.id)}
              className="flex-1 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Folder className="w-4 h-4" />
                <div className="text-left">
                  <div className="text-sm">{folder.name}</div>
                  {folder.description && (
                    <div className="text-xs opacity-70">{folder.description}</div>
                  )}
                </div>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">
                {folder.wallpaper_count || folder.banner_count || folder.media_count || folder.sparkle_count || 0}
              </span>
            </button>

            {/* Edit & Delete Buttons */}
            {selectedFolder === folder.id && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(folder);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Edit folder"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(folder);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Delete folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-gray-900">Create New Folder</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFolderName("");
                  setFolderDescription("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g., Lord Murugan, Festivals, Nature"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d5e38]/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder="Brief description of this folder"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d5e38]/20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFolderName("");
                    setFolderDescription("");
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-3 bg-[#0d5e38] text-white rounded-xl hover:bg-[#0a4a2b] transition-colors"
                >
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {showEditModal && editingFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-gray-900">Edit Folder</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingFolder(null);
                  setFolderName("");
                  setFolderDescription("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g., Lord Murugan, Festivals, Nature"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d5e38]/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder="Brief description of this folder"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d5e38]/20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingFolder(null);
                    setFolderName("");
                    setFolderDescription("");
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  className="flex-1 px-4 py-3 bg-[#0d5e38] text-white rounded-xl hover:bg-[#0a4a2b] transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
