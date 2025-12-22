import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Save } from "lucide-react";
import * as adminAPI from "../../utils/adminAPI";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type ExperimentStatus = "draft" | "running" | "paused" | "completed";

type VariantRow = {
  id?: string;
  variant_key: string;
  traffic_percent: number;
  config: any;
};

type ExperimentRow = {
  id: string;
  name: string;
  description: string | null;
  status: ExperimentStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  variants?: VariantRow[];
};

function fmtDate(value: string | null) {
  if (!value) return "-";
  return value;
}

function safeStringifyJson(v: any) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function parseJsonOrEmpty(s: string) {
  try {
    const v = JSON.parse(s);
    if (v && typeof v === "object") return v;
    return {};
  } catch {
    return {};
  }
}

export function AdminExperiments() {
  const [rows, setRows] = useState<ExperimentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<ExperimentRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [variantsOpen, setVariantsOpen] = useState(false);
  const [variantsFor, setVariantsFor] = useState<ExperimentRow | null>(null);
  const [variantDraft, setVariantDraft] = useState<
    Array<{ variant_key: string; traffic_percent: string; configText: string }>
  >([]);

  const statuses = useMemo(
    () => [
      { id: "draft" as const, label: "Draft" },
      { id: "running" as const, label: "Running" },
      { id: "paused" as const, label: "Paused" },
      { id: "completed" as const, label: "Completed" },
    ],
    [],
  );

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = (await adminAPI.getAdminExperiments()) as any;
      const data = (res?.data || []) as ExperimentRow[];
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load experiments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing({
      id: "",
      name: "",
      description: null,
      status: "draft",
      start_date: null,
      end_date: null,
      created_at: null,
      variants: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (r: ExperimentRow) => {
    setEditing({ ...r });
    setDialogOpen(true);
  };

  const saveExperiment = async () => {
    if (!editing) return;
    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: editing.name,
        description: editing.description,
        status: editing.status,
        start_date: editing.start_date,
        end_date: editing.end_date,
      };

      if (!editing.id) {
        await adminAPI.createAdminExperiment(payload);
      } else {
        await adminAPI.updateAdminExperiment(editing.id, payload);
      }

      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save experiment");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (r: ExperimentRow, next: ExperimentStatus) => {
    try {
      setLoading(true);
      setError(null);
      await adminAPI.updateAdminExperiment(r.id, { status: next });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const openVariants = (r: ExperimentRow) => {
    setVariantsFor(r);
    const existing = (r.variants || []).length > 0 ? (r.variants || []) : [
      { variant_key: "A", traffic_percent: 50, config: {} },
      { variant_key: "B", traffic_percent: 50, config: {} },
    ];

    setVariantDraft(
      existing.map((v) => ({
        variant_key: v.variant_key,
        traffic_percent: String(v.traffic_percent ?? 0),
        configText: safeStringifyJson(v.config),
      })),
    );

    setVariantsOpen(true);
  };

  const saveVariants = async () => {
    if (!variantsFor) return;
    try {
      setLoading(true);
      setError(null);

      const variants = variantDraft
        .map((v) => ({
          variant_key: v.variant_key.trim(),
          traffic_percent: parseInt(v.traffic_percent || "0", 10) || 0,
          config: parseJsonOrEmpty(v.configText),
        }))
        .filter((v) => v.variant_key);

      await adminAPI.upsertAdminExperimentVariants(variantsFor.id, variants);
      setVariantsOpen(false);
      setVariantsFor(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save variants");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Experiments</h3>
          <p className="text-gray-500 mt-1">Manage feature/UX experiments (not marketing A/B)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openCreate} disabled={loading}>
            <Plus className="w-4 h-4" />
            New
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All Experiments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 font-medium text-gray-700">Name</th>
                  <th className="text-left py-2 pr-3 font-medium text-gray-700">Status</th>
                  <th className="text-left py-2 pr-3 font-medium text-gray-700">Start</th>
                  <th className="text-left py-2 pr-3 font-medium text-gray-700">End</th>
                  <th className="text-right py-2 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-3">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      {r.description ? <div className="text-gray-500 mt-1">{r.description}</div> : null}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex rounded-md border px-2 py-1 text-xs text-gray-700">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-gray-700">{fmtDate(r.start_date)}</td>
                    <td className="py-3 pr-3 text-gray-700">{fmtDate(r.end_date)}</td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(r)} disabled={loading}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openVariants(r)} disabled={loading}>
                          Variants
                        </Button>
                        {r.status !== "running" ? (
                          <Button size="sm" onClick={() => toggleStatus(r, "running")} disabled={loading}>
                            Run
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => toggleStatus(r, "paused")} disabled={loading}>
                            Pause
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No experiments found
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o: boolean) => setDialogOpen(o)}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Experiment" : "New Experiment"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <Input
                value={editing?.name || ""}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                value={editing?.description || ""}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select
                  value={editing?.status || "draft"}
                  onValueChange={(v: string) =>
                    setEditing((prev) => (prev ? { ...prev, status: v as ExperimentStatus } : prev))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Start Date (UTC)</label>
                <Input
                  type="date"
                  value={editing?.start_date || ""}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, start_date: e.target.value || null } : prev))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">End Date (UTC)</label>
                <Input
                  type="date"
                  value={editing?.end_date || ""}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, end_date: e.target.value || null } : prev))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={saveExperiment} disabled={loading || !editing?.name}>
              <Save className="w-4 h-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={variantsOpen} onOpenChange={(o: boolean) => setVariantsOpen(o)}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Variants</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {variantDraft.map((v, idx) => (
              <div key={idx} className="rounded-lg border p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Variant Key</label>
                    <Input
                      value={v.variant_key}
                      onChange={(e) =>
                        setVariantDraft((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, variant_key: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Traffic %</label>
                    <Input
                      type="number"
                      value={v.traffic_percent}
                      onChange={(e) =>
                        setVariantDraft((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, traffic_percent: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Config (JSON)</label>
                  <Textarea
                    value={v.configText}
                    onChange={(e) =>
                      setVariantDraft((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, configText: e.target.value } : x)),
                      )
                    }
                  />
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={() =>
                setVariantDraft((prev) => [...prev, { variant_key: "", traffic_percent: "0", configText: "{}" }])
              }
              disabled={loading}
            >
              <Plus className="w-4 h-4" />
              Add Variant
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantsOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={saveVariants} disabled={loading}>
              <Save className="w-4 h-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
