import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

interface CompactDatePickerProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  disabled?: (date: Date) => boolean;
}

export function CompactDatePicker({ selected, onSelect, disabled }: CompactDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = monthStart.getDay();

  // Create empty cells for days before the month starts
  const emptyCells = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    if (disabled && disabled(date)) return;
    onSelect(date);
  };

  const isToday = (date: Date) => isSameDay(date, new Date());
  const isSelected = (date: Date) => selected ? isSameDay(date, selected) : false;
  const isDisabled = (date: Date) => disabled ? disabled(date) : false;

  return (
    <div className="w-[200px] select-none bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          type="button"
        >
          <ChevronLeft className="w-3 h-3 text-gray-600" />
        </button>
        <span className="text-[11px] font-medium text-gray-700">
          {format(currentMonth, "MMM yyyy")}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          type="button"
        >
          <ChevronRight className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-[8px] font-medium text-gray-500 py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells for days before month starts */}
        {emptyCells.map((i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Actual days */}
        {daysInMonth.map((date) => {
          const disabled = isDisabled(date);
          const selected = isSelected(date);
          const today = isToday(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              type="button"
              className={`
                w-6 h-6 flex items-center justify-center text-[9px] rounded transition-colors
                ${disabled 
                  ? "text-gray-300 cursor-not-allowed" 
                  : "hover:bg-gray-100 cursor-pointer"
                }
                ${selected 
                  ? "bg-green-600 text-white hover:bg-green-700 font-semibold" 
                  : ""
                }
                ${today && !selected 
                  ? "bg-gray-100 font-semibold" 
                  : ""
                }
              `}
            >
              {format(date, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
