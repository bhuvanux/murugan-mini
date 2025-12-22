import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { toast } from "sonner@2.0.3";
import * as adminAPI from "../../utils/adminAPI";

type PopupBanner = {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string | null;
  target_url?: string | null;
  publish_status: string;
  scheduled_at?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_enabled: boolean;
  priority: number;
  view_count: number;
  click_count: number;
  created_at: string;
  is_active?: boolean;
  pushed_at?: string | null;
};

function toInputDateTimeValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminPopupBannerManager() {
  const [items, setItems] = useState<PopupBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PopupBanner | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [pushingId, setPushingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    target_url: "",
    publishStatus: "draft" as "draft" | "published" | "scheduled",
    scheduled_at: "",
    starts_at: "",
    ends_at: "",
    is_enabled: true,
    priority: 0,
  });

  const recommended = useMemo(() => {
    return {
      desktop: "1080 × 1920 px (portrait)",
      mobile: "1080 × 1920 px (portrait)",
      safe: "Keep key text within 900 × 1600 px safe area",
    };
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getPopupBanners();
      setItems(res.data || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load popup banners");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFile(null);
    setForm({
      title: "",
      target_url: "",
      publishStatus: "draft",
      scheduled_at: "",
      starts_at: "",
      ends_at: "",
      is_enabled: true,
      priority: 0,
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: PopupBanner) => {
    setEditing(item);
    setFile(null);
    setForm({
      title: item.title || "",
      target_url: item.target_url || "",
      publishStatus: (item.publish_status as any) || "draft",
      scheduled_at: toInputDateTimeValue(item.scheduled_at),
      starts_at: toInputDateTimeValue(item.starts_at),
      ends_at: toInputDateTimeValue(item.ends_at),
      is_enabled: item.is_enabled !== false,
      priority: item.priority || 0,
    });
    setIsModalOpen(true);
  };

  const save = async () => {
    try {
      setSaving(true);

      if (editing) {
        if (file) {
          const imageRes = await adminAPI.updatePopupBannerImage(editing.id, file);
          if (!imageRes.success) throw new Error(imageRes.error || "Image replace failed");
        }
        const payload: any = {
          title: form.title,
          target_url: form.target_url || null,
          publish_status: form.publishStatus,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          is_enabled: form.is_enabled,
          priority: Number(form.priority) || 0,
        };
        const res = await adminAPI.updatePopupBanner(editing.id, payload);
        if (!res.success) throw new Error(res.error || "Update failed");
        toast.success("Popup banner updated");
      } else {
        if (!file) {
          toast.error("Please choose an image");
          return;
        }
        const payload: any = {
          title: form.title,
          target_url: form.target_url || undefined,
          publishStatus: form.publishStatus,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
          is_enabled: String(form.is_enabled),
          priority: String(Number(form.priority) || 0),
        };
        const res = await adminAPI.uploadPopupBanner(file, payload);
        if (!res.success) throw new Error(res.error || "Upload failed");
        toast.success("Popup banner created");
      }

      setIsModalOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: PopupBanner) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      const res = await adminAPI.deletePopupBanner(item.id);
      if (!res.success) throw new Error(res.error || "Delete failed");
      toast.success("Deleted");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6 text-inter-regular-14">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-inter-bold-20 text-gray-800">Popup Banners</h2>
          <p className="text-gray-500 mt-1 text-inter-regular-14">
            Full-screen popup promotions/wishes shown on dashboard.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-medium text-inter-medium-16"
        >
          <Plus className="w-5 h-5" />
          Create Popup
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
            <p className="text-gray-600 text-inter-regular-14">Loading popup banners...</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-gray-800 mb-2 text-inter-semibold-18">No popup banners</h3>
          <p className="text-gray-500 mb-4 text-inter-regular-14">Create your first popup banner.</p>
          <button
            onClick={openCreate}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16"
          >
            Create Popup
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POPUP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ENABLED</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRIORITY</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VIEWS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CLICKS</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={it.thumbnail_url || it.image_url}
                        alt={it.title}
                        className="w-16 h-10 object-cover rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900 text-inter-medium-16">{it.title}</div>
                        {it.target_url && (
                          <div className="text-sm text-blue-600 line-clamp-1 text-inter-regular-14">{it.target_url}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-inter-regular-14">
                    <div className="flex flex-col gap-1">
                      <span>{it.publish_status}</span>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                          it.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {it.is_active ? "Live" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {it.is_enabled ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <Eye className="w-4 h-4" /> Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <EyeOff className="w-4 h-4" /> Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-inter-regular-14">{it.priority || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-inter-regular-14">{it.view_count || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-inter-regular-14">{it.click_count || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(it)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-white transition-colors text-inter-medium-14"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(it)}
                        className="p-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        disabled={pushingId === it.id || it.is_active || !it.image_url}
                        onClick={async () => {
                          if (!it.image_url) {
                            toast.error("Image must be uploaded before pushing.");
                            return;
                          }
                          setPushingId(it.id);
                          try {
                            const res = await adminAPI.pushPopupBanner(it.id);
                            if (!res.success) throw new Error(res.error || "Push failed");
                            toast.success("Banner pushed live");
                            await load();
                          } catch (e: any) {
                            toast.error(e?.message || "Push failed");
                          } finally {
                            setPushingId(null);
                          }
                        }}
                        className="px-3 py-1.5 border border-emerald-500 rounded-lg hover:bg-emerald-50 transition-colors text-inter-medium-14 disabled:opacity-60"
                        title={it.is_active ? "Already live" : "Push this banner to all users"}
                      >
                        {pushingId === it.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                          "Push"
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-inter-semibold-18 text-gray-800">{editing ? "Edit Popup Banner" : "Create Popup Banner"}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Recommended size: {recommended.mobile}. {recommended.safe}.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!editing ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Replace Image (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Uploading a new image will replace the existing banner.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target URL</label>
                <input
                  type="text"
                  value={form.target_url}
                  onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                  placeholder='Example: "tab:spark" or "https://..."'
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={form.publishStatus}
                    onChange={(e) => setForm({ ...form, publishStatus: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Enabled</label>
                  <select
                    value={form.is_enabled ? "true" : "false"}
                    onChange={(e) => setForm({ ...form, is_enabled: e.target.value === "true" })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>

              {form.publishStatus === "scheduled" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled At</label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Starts At (optional)</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ends At (optional)</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority (higher shows first)</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
