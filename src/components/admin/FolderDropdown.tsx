import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Edit2, Trash2, X, Check, Folder } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface Folder {
  id: string;
  name: string;
  description?: string;
  wallpaper_count?: number;
}

interface FolderDropdownProps {
  folders: Folder[];
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, description?: string) => Promise<void>;
  onUpdateFolder: (folderId: string, name: string, description?: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  allWallpapersCount: number;
  uncategorizedCount?: number;
}

export function FolderDropdown({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  allWallpapersCount,
  uncategorizedCount = 0,
}: FolderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateInput(false);
        setEditingFolderId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    try {
      await onCreateFolder(newFolderName.trim());
      toast.success("Folder created successfully");
      setNewFolderName("");
      setShowCreateInput(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create folder");
    }
  };

  const handleUpdateFolder = async (folderId: string) => {
    if (!editingName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    try {
      await onUpdateFolder(folderId, editingName.trim());
      toast.success("Folder updated successfully");
      setEditingFolderId(null);
      setEditingName("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update folder");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    if (!confirm(`Delete "${folder.name}"? All wallpapers will be moved to uncategorized.`)) {
      return;
    }

    try {
      await onDeleteFolder(folderId);
      toast.success("Folder deleted successfully");
      if (selectedFolder === folderId) {
        onSelectFolder(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete folder");
    }
  };

  const getSelectedFolderName = () => {
    if (!selectedFolder) return "All Wallpapers";
    const folder = folders.find((f) => f.id === selectedFolder);
    return folder?.name || "All Wallpapers";
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-between text-inter-medium-16"
      >
        <span className="text-gray-900">{getSelectedFolderName()}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* All Wallpapers Option */}
          <button
            onClick={() => {
              onSelectFolder(null);
              setIsOpen(false);
            }}
            className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between border-b border-gray-200 ${
              !selectedFolder ? "bg-green-50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <Folder className={`w-4 h-4 ${!selectedFolder ? "text-green-600" : "text-gray-400"}`} />
              <span className={`text-inter-medium-16 ${!selectedFolder ? "text-green-700" : "text-gray-900"}`}>
                All Wallpapers
              </span>
            </div>
            <span className={`text-sm ${!selectedFolder ? "text-green-600" : "text-gray-500"}`}>
              {allWallpapersCount}
            </span>
          </button>

          {/* Create New Folder */}
          <div className="border-b border-gray-200">
            {!showCreateInput ? (
              <button
                onClick={() => setShowCreateInput(true)}
                className="w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-green-600"
              >
                <Plus className="w-4 h-4" />
                <span className="text-inter-medium-16">Create New Folder</span>
              </button>
            ) : (
              <div className="px-5 py-3 space-y-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-inter-regular-14"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleCreateFolder();
                    } else if (e.key === "Escape") {
                      setShowCreateInput(false);
                      setNewFolderName("");
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateFolder}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateInput(false);
                      setNewFolderName("");
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Folder List */}
          <div className="py-1">
            {folders.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Folder className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm text-inter-regular-14">No folders yet</p>
                <p className="text-gray-400 text-xs text-inter-regular-14 mt-1">
                  Create a folder to organize your wallpapers
                </p>
              </div>
            ) : (
              folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`group ${
                    selectedFolder === folder.id ? "bg-green-50" : "hover:bg-gray-50"
                  } transition-colors`}
                >
                  {editingFolderId === folder.id ? (
                    <div className="px-5 py-3 space-y-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-inter-regular-14"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateFolder(folder.id);
                          } else if (e.key === "Escape") {
                            setEditingFolderId(null);
                            setEditingName("");
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateFolder(folder.id)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16 flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingFolderId(null);
                            setEditingName("");
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-5 py-3">
                      <button
                        onClick={() => {
                          onSelectFolder(folder.id);
                          setIsOpen(false);
                        }}
                        className="flex-1 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Folder
                            className={`w-4 h-4 ${
                              selectedFolder === folder.id ? "text-green-600" : "text-gray-400"
                            }`}
                          />
                          <span
                            className={`text-inter-medium-16 ${
                              selectedFolder === folder.id ? "text-green-700" : "text-gray-900"
                            }`}
                          >
                            {folder.name}
                          </span>
                        </div>
                        <span
                          className={`text-sm mr-2 ${
                            selectedFolder === folder.id ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          {folder.wallpaper_count || 0}
                        </span>
                      </button>

                      {/* Edit & Delete Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderId(folder.id);
                            setEditingName(folder.name);
                          }}
                          className="p-2 hover:bg-white rounded-lg transition-colors"
                          title="Edit folder"
                        >
                          <Edit2 className="w-3 h-3 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="p-2 hover:bg-white rounded-lg transition-colors"
                          title="Delete folder"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
