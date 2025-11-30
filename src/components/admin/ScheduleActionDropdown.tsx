import React, { useState } from "react";
import { MoreVertical, Calendar, PlayCircle, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface ScheduleActionDropdownProps {
  onReschedule: () => void;
  onPublishNow: () => void;
  onCancelSchedule: () => void;
}

export function ScheduleActionDropdown({
  onReschedule,
  onPublishNow,
  onCancelSchedule,
}: ScheduleActionDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-5 h-5 text-gray-600" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onReschedule();
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          <span>Reschedule</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onPublishNow();
          }}
          className="flex items-center gap-2 cursor-pointer text-green-600"
        >
          <PlayCircle className="w-4 h-4" />
          <span>Publish Now</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onCancelSchedule();
          }}
          className="flex items-center gap-2 cursor-pointer text-red-600"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancel Schedule</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
