import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SuperDashboardKPIProps {
    icon: LucideIcon;
    label: string;
    value: string;
    subValue?: string;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
    tooltip?: string;
}

export function SuperDashboardKPI({
    icon: Icon,
    label,
    value,
    subValue,
    color,
    tooltip,
}: SuperDashboardKPIProps) {
    const colorClasses = {
        blue: "bg-blue-100 text-blue-600",
        green: "bg-green-100 text-green-600",
        purple: "bg-purple-100 text-purple-600",
        orange: "bg-orange-100 text-orange-600",
        red: "bg-red-100 text-red-600",
        gray: "bg-gray-100 text-gray-600",
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 border relative group" title={tooltip}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
            {subValue && <div className="text-xs text-gray-400 mt-0.5">{subValue}</div>}
            {tooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {tooltip}
                </div>
            )}
        </div>
    );
}
