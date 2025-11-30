import React from 'react';
import { Bell, Clock, Repeat, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface ReminderCardProps {
  reminder: {
    id: string;
    title: string;
    description?: string;
    remind_at: string;
    repeat?: 'once' | 'daily' | 'weekly';
    channel?: 'push' | 'alarm' | 'in-app';
    active?: boolean;
    created_at?: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function ReminderCard({ reminder, onEdit, onDelete, compact = false }: ReminderCardProps) {
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = date.toLocaleDateString();
    const todayOnly = today.toLocaleDateString();
    const tomorrowOnly = tomorrow.toLocaleDateString();

    const time = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    if (dateOnly === todayOnly) {
      return `Today at ${time}`;
    } else if (dateOnly === tomorrowOnly) {
      return `Tomorrow at ${time}`;
    } else {
      return `${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })} at ${time}`;
    }
  };

  const getRepeatLabel = (repeat?: string) => {
    switch (repeat) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'once':
      default: return 'Once';
    }
  };

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'push': return '📱';
      case 'alarm': return '⏰';
      case 'in-app':
      default: return '🔔';
    }
  };

  if (compact) {
    return (
      <div className="p-3 rounded-lg bg-[#0d5e38]/5 border border-[#0d5e38]/10 hover:bg-[#0d5e38]/10 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-[#0d5e38] flex-shrink-0" />
              <span className="text-sm text-gray-900 truncate">{reminder.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Clock className="w-3 h-3" />
              <span>{formatDateTime(reminder.remind_at)}</span>
              {reminder.repeat && reminder.repeat !== 'once' && (
                <>
                  <span className="text-gray-400">•</span>
                  <Repeat className="w-3 h-3" />
                  <span>{getRepeatLabel(reminder.repeat)}</span>
                </>
              )}
            </div>
          </div>
          
          {!reminder.active && (
            <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`overflow-hidden ${
      reminder.active 
        ? 'bg-gradient-to-br from-[#0d5e38]/5 to-white border-[#0d5e38]/20' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2.5 rounded-full ${
              reminder.active 
                ? 'bg-[#0d5e38]/10' 
                : 'bg-gray-200'
            }`}>
              <Bell className={`w-5 h-5 ${
                reminder.active ? 'text-[#0d5e38]' : 'text-gray-500'
              }`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className={`mb-1 ${
                reminder.active ? 'text-gray-900' : 'text-gray-500 line-through'
              }`}>
                {reminder.title}
              </h4>
              
              {reminder.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {reminder.description}
                </p>
              )}
            </div>
          </div>

          {reminder.active && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onEdit}
                  className="h-8 w-8 p-0 text-gray-600 hover:text-[#0d5e38] hover:bg-[#0d5e38]/10"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className={reminder.active ? 'text-gray-700' : 'text-gray-500'}>
              {formatDateTime(reminder.remind_at)}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {reminder.repeat && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Repeat className="w-4 h-4" />
                <span>{getRepeatLabel(reminder.repeat)}</span>
              </div>
            )}

            {reminder.channel && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <span>{getChannelIcon(reminder.channel)}</span>
                <span className="capitalize">{reminder.channel}</span>
              </div>
            )}
          </div>

          {!reminder.active && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
              <CheckCircle className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Completed</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
