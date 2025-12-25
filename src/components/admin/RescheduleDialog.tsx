import React, { useState } from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";

interface RescheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentScheduledAt: string | null;
  onReschedule: (newDate: Date) => Promise<void>;
  wallpaperTitle: string;
}

export function RescheduleDialog({
  isOpen,
  onClose,
  currentScheduledAt,
  onReschedule,
  wallpaperTitle,
}: RescheduleDialogProps) {
  // Initialize with current scheduled date if valid, otherwise use tomorrow at noon
  const getInitialDate = () => {
    if (currentScheduledAt) {
      const date = new Date(currentScheduledAt);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    // Default to tomorrow at 12:00 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    return tomorrow;
  };

  const [newScheduleDate, setNewScheduleDate] = useState<Date>(getInitialDate());
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleReschedule = async () => {
    if (!newScheduleDate) {
      toast.error("Please select a date and time");
      return;
    }

    if (newScheduleDate <= new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    setIsRescheduling(true);
    try {
      await onReschedule(newScheduleDate);
      toast.success("Wallpaper rescheduled successfully");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to reschedule");
    } finally {
      setIsRescheduling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-800 text-inter-semibold-18">
            Reschedule Wallpaper
          </h3>
          <button
            onClick={onClose}
            disabled={isRescheduling}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 text-inter-regular-14 mb-1">Wallpaper:</p>
            <p className="font-medium text-gray-900 text-inter-medium-16">{wallpaperTitle}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-inter-medium-16">
              New Schedule Date & Time
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 justify-start">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900 text-inter-regular-14">
                    {newScheduleDate ? format(newScheduleDate, "PPP 'at' HH:mm") : "Select date and time"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={newScheduleDate}
                  onSelect={(date) => date && setNewScheduleDate(date)}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
                <div className="p-3 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-inter-medium-16">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newScheduleDate ? format(newScheduleDate, "HH:mm") : "12:00"}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(":");
                      const newDate = new Date(newScheduleDate || new Date());
                      newDate.setHours(parseInt(hours), parseInt(minutes));
                      setNewScheduleDate(newDate);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isRescheduling}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 text-inter-medium-16"
          >
            Cancel
          </button>
          <button
            onClick={handleReschedule}
            disabled={isRescheduling}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-inter-medium-16"
          >
            {isRescheduling ? "Rescheduling..." : "Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
