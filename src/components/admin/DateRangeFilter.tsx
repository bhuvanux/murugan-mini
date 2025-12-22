import { useState } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CompactDatePicker } from "./CompactDatePicker";
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from "date-fns";

export type DateRangePreset = "today" | "week" | "month" | "year" | "custom";

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: Date | null, endDate: Date | null, preset: DateRangePreset) => void;
}

export function DateRangeFilter({ onDateRangeChange }: DateRangeFilterProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>("month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [open, setOpen] = useState(false);

  const MAX_RANGE_DAYS = 90;

  const applyPreset = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    const now = new Date();

    switch (preset) {
      case "today":
        onDateRangeChange(startOfDay(now), endOfDay(now), preset);
        setOpen(false);
        break;
      case "week":
        onDateRangeChange(subWeeks(now, 1), now, preset);
        setOpen(false);
        break;
      case "month":
        onDateRangeChange(subMonths(now, 1), now, preset);
        setOpen(false);
        break;
      case "year":
        onDateRangeChange(subDays(now, MAX_RANGE_DAYS), now, preset);
        setOpen(false);
        break;
      case "custom":
        setShowCustomPicker(true);
        // Keep popover open for custom range
        break;
    }
  };

  const applyCustomRange = () => {
    if (customStartDate && customEndDate) {
      const diffDays = Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const start = diffDays > MAX_RANGE_DAYS ? subDays(customEndDate, MAX_RANGE_DAYS) : customStartDate;
      onDateRangeChange(start, customEndDate, "custom");
      setShowCustomPicker(false);
      setOpen(false);
    }
  };

  const getDisplayText = () => {
    if (selectedPreset === "custom" && customStartDate && customEndDate) {
      return `${format(customStartDate, "MMM dd")} - ${format(customEndDate, "MMM dd, yyyy")}`;
    }
    
    switch (selectedPreset) {
      case "today":
        return "Today";
      case "week":
        return "Last 7 Days";
      case "month":
        return "Last 30 Days";
      case "year":
        return "Last 90 Days";
      default:
        return "Select Range";
    }
  };

  return (
    <Popover open={open} onOpenChange={(isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        setShowCustomPicker(false);
      }
    }}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <CalendarIcon className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-700">{getDisplayText()}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" onOpenAutoFocus={(e: Event) => e.preventDefault()}>
        <div className="p-2 space-y-1">
          <button
            onClick={() => applyPreset("today")}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
              selectedPreset === "today"
                ? "bg-green-100 text-green-700 font-medium"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => applyPreset("week")}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
              selectedPreset === "week"
                ? "bg-green-100 text-green-700 font-medium"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => applyPreset("month")}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
              selectedPreset === "month"
                ? "bg-green-100 text-green-700 font-medium"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => applyPreset("year")}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
              selectedPreset === "year"
                ? "bg-green-100 text-green-700 font-medium"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            Last 90 Days
          </button>
          <div className="border-t pt-1 mt-1">
            <button
              onClick={() => applyPreset("custom")}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                selectedPreset === "custom"
                  ? "bg-green-100 text-green-700 font-medium"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {showCustomPicker && (
          <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Start Date</label>
              <div className="bg-white p-2 rounded-md border border-gray-200">
                <CompactDatePicker
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">End Date</label>
              <div className="bg-white p-2 rounded-md border border-gray-200">
                <CompactDatePicker
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  disabled={(date) => customStartDate ? date < customStartDate : false}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setShowCustomPicker(false);
                  setSelectedPreset("month");
                  setOpen(false);
                }}
                className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-[11px]"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={applyCustomRange}
                disabled={!customStartDate || !customEndDate}
                className="flex-1 px-2.5 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-medium"
                type="button"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
