import React from 'react';
import { Flame, CheckCircle, Gift, Calendar } from 'lucide-react';

interface VrathamGuideCardProps {
  vratham: {
    name: string;
    deity: string;
    significance: string;
    rules?: string[];
    benefits?: string[];
    duration?: string;
  };
  onSetReminder?: () => void;
}

export function VrathamGuideCard({ vratham, onSetReminder }: VrathamGuideCardProps) {
  return (
    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-200/50 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-rose-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Flame className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1">
          <h4 className="text-gray-900 mb-1">
            {vratham.name}
          </h4>
          <p className="text-sm text-gray-600">
            Dedicated to {vratham.deity}
          </p>
        </div>
      </div>

      {/* Significance */}
      <div className="bg-white/60 rounded-xl p-3">
        <p className="text-sm text-gray-700 leading-relaxed">
          {vratham.significance}
        </p>
      </div>

      {/* Rules */}
      {vratham.rules && vratham.rules.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-rose-600" />
            <h5 className="text-sm font-medium text-gray-900">Rules to Follow</h5>
          </div>
          <ul className="space-y-1.5 ml-6">
            {vratham.rules.map((rule, index) => (
              <li key={index} className="text-sm text-gray-700 list-disc">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Benefits */}
      {vratham.benefits && vratham.benefits.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-rose-600" />
            <h5 className="text-sm font-medium text-gray-900">Benefits</h5>
          </div>
          <ul className="space-y-1.5 ml-6">
            {vratham.benefits.map((benefit, index) => (
              <li key={index} className="text-sm text-gray-700 list-disc">
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Duration & Reminder */}
      <div className="flex items-center justify-between pt-2 border-t border-rose-200/50">
        {vratham.duration && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{vratham.duration}</span>
          </div>
        )}
        
        {onSetReminder && (
          <button
            onClick={onSetReminder}
            className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white text-sm rounded-lg hover:from-rose-700 hover:to-pink-700 transition-all"
          >
            Set Reminder
          </button>
        )}
      </div>
    </div>
  );
}