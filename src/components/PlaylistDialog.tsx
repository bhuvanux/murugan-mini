// Playlist management dialog
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Plus, Music, Check } from "lucide-react";
import { toast } from "sonner";

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

interface PlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId?: string;
  songTitle?: string;
}

export function PlaylistDialog({ open, onOpenChange, songId, songTitle }: PlaylistDialogProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreateNew, setShowCreateNew] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, [open]);

  const loadPlaylists = () => {
    const saved = localStorage.getItem("music_playlists");
    if (saved) {
      try {
        setPlaylists(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load playlists:", error);
        setPlaylists([]);
      }
    }
  };

  const savePlaylists = (updatedPlaylists: Playlist[]) => {
    localStorage.setItem("music_playlists", JSON.stringify(updatedPlaylists));
    setPlaylists(updatedPlaylists);
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      songIds: songId ? [songId] : [],
      createdAt: Date.now(),
    };

    const updated = [...playlists, newPlaylist];
    savePlaylists(updated);
    
    toast.success(`Created playlist "${newPlaylist.name}"${songId ? ` and added "${songTitle}"` : ""}`);
    setNewPlaylistName("");
    setShowCreateNew(false);
    
    if (songId) {
      onOpenChange(false);
    }
  };

  const addToPlaylist = (playlistId: string) => {
    if (!songId) return;

    const updated = playlists.map(playlist => {
      if (playlist.id === playlistId) {
        if (playlist.songIds.includes(songId)) {
          toast.info(`"${songTitle}" is already in this playlist`);
          return playlist;
        }
        return {
          ...playlist,
          songIds: [...playlist.songIds, songId],
        };
      }
      return playlist;
    });

    savePlaylists(updated);
    const playlist = updated.find(p => p.id === playlistId);
    toast.success(`Added "${songTitle}" to "${playlist?.name}"`);
    onOpenChange(false);
  };

  const isSongInPlaylist = (playlistId: string) => {
    if (!songId) return false;
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist?.songIds.includes(songId) || false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
            {songId ? `Add "${songTitle}" to playlist` : "Your Playlists"}
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--font-english)' }}>
            {songId ? "Select a playlist or create a new one" : "Manage your playlists"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Existing Playlists */}
          {playlists.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {playlists.map(playlist => (
                <button
                  key={playlist.id}
                  onClick={() => songId && addToPlaylist(playlist.id)}
                  disabled={!songId}
                  className={`w-full p-3 rounded-lg border flex items-center justify-between transition-colors ${
                    songId 
                      ? 'hover:bg-gray-50 cursor-pointer' 
                      : 'cursor-default'
                  } ${
                    isSongInPlaylist(playlist.id)
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0d5e38] flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-gray-900" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                        {playlist.name}
                      </p>
                      <p className="text-gray-500 text-sm" style={{ fontFamily: 'var(--font-english)' }}>
                        {playlist.songIds.length} {playlist.songIds.length === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                  </div>
                  {isSongInPlaylist(playlist.id) && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                </button>
              ))}
            </div>
          )}

          {playlists.length === 0 && !showCreateNew && (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm" style={{ fontFamily: 'var(--font-english)' }}>
                No playlists yet. Create your first one!
              </p>
            </div>
          )}

          {/* Create New Playlist */}
          {showCreateNew ? (
            <div className="space-y-2 p-3 border border-[#0d5e38] rounded-lg bg-green-50">
              <Input
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
                autoFocus
                style={{ fontFamily: 'var(--font-english)' }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={createPlaylist}
                  className="flex-1"
                  style={{ 
                    background: '#0d5e38',
                    fontFamily: 'var(--font-english)',
                    fontWeight: 600
                  }}
                >
                  Create
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateNew(false);
                    setNewPlaylistName("");
                  }}
                  variant="outline"
                  style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowCreateNew(true)}
              variant="outline"
              className="w-full border-dashed border-2 border-[#0d5e38] text-[#0d5e38] hover:bg-green-50"
              style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Playlist
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
