import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, TrendingUp, RefreshCw } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TrackingModule, TRACKING_MODULES } from '../../types/tracking';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface CalendarDay {
  date: string;
  count: number;
  day: number;
  month: number;
  year: number;
}

export function TrackingCalendar() {
  const [selectedModule, setSelectedModule] = useState<TrackingModule>('wallpaper');
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/tracking/calendar/${selectedModule}?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load calendar data');
      }

      const data = await response.json();
      setCalendarData(data.calendar || []);
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [selectedModule, days]);

  const maxCount = Math.max(...calendarData.map(d => d.count), 1);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-green-600';
    if (intensity > 0.5) return 'bg-green-500';
    if (intensity > 0.25) return 'bg-green-400';
    return 'bg-green-300';
  };

  const totalEvents = calendarData.reduce((sum, d) => sum + d.count, 0);
  const avgPerDay = totalEvents / calendarData.length;

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-[#0d5e38]" />
          <div>
            <h2 className="font-semibold text-gray-800">Activity Calendar</h2>
            <p className="text-sm text-gray-500">Event tracking heatmap</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedModule} onValueChange={(v) => setSelectedModule(v as TrackingModule)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRACKING_MODULES.map(module => (
                <SelectItem key={module.id} value={module.id}>
                  {module.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={loadCalendarData}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Events</p>
          <p className="text-[#0d5e38]">{totalEvents.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Avg per Day</p>
          <p className="text-[#0d5e38]">{avgPerDay.toFixed(1)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Peak Day</p>
          <p className="text-[#0d5e38]">{maxCount}</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarData.map((day, index) => {
            const date = new Date(day.date);
            const dayOfWeek = date.getDay();

            return (
              <div
                key={day.date}
                className={`aspect-square rounded-lg ${getHeatmapColor(day.count)} 
                  hover:ring-2 hover:ring-[#0d5e38] transition-all cursor-pointer
                  flex items-center justify-center relative group`}
                title={`${day.date}: ${day.count} events`}
              >
                <span className="text-xs font-semibold text-gray-700">
                  {day.day}
                </span>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                  hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {day.date}
                  <br />
                  {day.count} events
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <div className="w-4 h-4 bg-green-300 rounded"></div>
          <div className="w-4 h-4 bg-green-400 rounded"></div>
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <div className="w-4 h-4 bg-green-600 rounded"></div>
        </div>
        <span>More</span>
      </div>
    </Card>
  );
}
