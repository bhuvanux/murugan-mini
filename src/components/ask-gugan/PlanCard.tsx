import React from 'react';
import { Target, Calendar, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface PlanCardProps {
  plan: {
    id: string;
    goal: string;
    duration_days: number;
    start_date: string;
    total_tasks: number;
  };
  onViewDetails?: () => void;
}

export function PlanCard({ plan, onViewDetails }: PlanCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getEndDate = () => {
    const startDate = new Date(plan.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);
    return formatDate(endDate.toISOString());
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-[#0d5e38]/5 to-white border-[#0d5e38]/20">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[#0d5e38] to-[#0a4a2a] text-white">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-white/20">
            <Target className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-white mb-1">30-Day Spiritual Plan</h4>
            <p className="text-white/90 text-sm">
              {plan.goal}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Plan Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-[#0d5e38]/5 border border-[#0d5e38]/10">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-[#0d5e38]" />
              <span className="text-xs text-gray-600">Duration</span>
            </div>
            <div className="text-[#0d5e38]">{plan.duration_days} Days</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0d5e38]/5 border border-[#0d5e38]/10">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-[#0d5e38]" />
              <span className="text-xs text-gray-600">Activities</span>
            </div>
            <div className="text-[#0d5e38]">{plan.total_tasks} Tasks</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="text-xs text-gray-600 mb-1">Start Date</div>
              <div className="text-gray-900">{formatDate(plan.start_date)}</div>
            </div>
            
            <div className="flex-1 mx-3">
              <div className="h-px bg-gradient-to-r from-blue-300 to-purple-300" />
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-600 mb-1">End Date</div>
              <div className="text-gray-900">{getEndDate()}</div>
            </div>
          </div>
        </div>

        {/* Progress Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Daily Activities Include:</span>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-[#0d5e38]" />
              <span>Morning prayers & meditation</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-[#0d5e38]" />
              <span>Mantra chanting (108 times)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-[#0d5e38]" />
              <span>Scripture reading & reflection</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={onViewDetails}
          className="w-full bg-[#0d5e38] hover:bg-[#0a4a2a] text-white"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          View Full Plan
        </Button>

        {/* Motivational Footer */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-center text-gray-600 italic">
            🙏 Consistency leads to spiritual growth. Start your journey today!
          </p>
        </div>
      </div>
    </Card>
  );
}
