import { useMemo, useState } from "react";

import { AdminDgMediaOverview } from "./AdminDgMediaOverview";
import { AdminDgMediaAssets } from "./AdminDgMediaAssets";
import { AdminDgMediaCompare } from "./AdminDgMediaCompare";

type Tab = "media" | "assets" | "compare";

export function AdminDgMediaHub() {
  const tabs = useMemo(
    () => [
      { id: "media" as const, label: "/admin/divine-guard/media" },
      { id: "assets" as const, label: "/admin/divine-guard/media/assets" },
      { id: "compare" as const, label: "/admin/divine-guard/media/compare" },
    ],
    [],
  );

  const [active, setActive] = useState<Tab>("media");

  const render = () => {
    switch (active) {
      case "media":
        return <AdminDgMediaOverview />;
      case "assets":
        return <AdminDgMediaAssets />;
      case "compare":
        return <AdminDgMediaCompare />;
      default:
        return <AdminDgMediaOverview />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Divine Guard — Media</h2>
        <p className="text-sm text-gray-500">Data from Divine Guard (dg_events, DG-MEDIA-*)</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex gap-1 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              active === t.id ? "bg-green-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {render()}
    </div>
  );
}
