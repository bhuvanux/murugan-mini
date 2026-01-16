import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SettingsContainerProps {
    children: React.ReactNode;
}

export const SettingsContainer: React.FC<SettingsContainerProps> = ({
    children
}) => {
    return (
        <div className="min-h-screen bg-[#f8faf7]">
            {/* Header is now handled by AppHeader in individual screens */}

            <main className="relative mx-auto max-w-3xl px-4 pb-32 pt-[185px] sm:pb-36 sm:pt-[185px]">
                <div className="space-y-8">{children}</div>
            </main>
        </div>
    );
};

interface SettingItemProps {
    icon: React.ReactNode;
    title: string;
    value?: string;
    onPress?: () => void;
    color?: string; // Hex code, defaults to primary
    isLast?: boolean;
}

export const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    value,
    onPress,
    color = '#0E9F8A',
    isLast = false
}) => {
    return (
        <button
            onClick={onPress}
            className={`w-full flex items-center justify-between gap-6 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition-all hover:border-gray-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-100 ${isLast ? '' : 'mb-3'}`}
        >
            <div className="flex items-center gap-6">
                <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50"
                    style={{ color }}
                >
                    {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { size: 20, color } as any) : icon}
                </div>
                <div className="text-left overflow-hidden flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                    {value && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {value}
                        </p>
                    )}
                </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
    );
};

interface SettingSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
}

export const SettingSection: React.FC<SettingSectionProps> = ({ title, description, children }) => {
    return (
        <section className="space-y-3">
            <div className="px-1 pt-2">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500">{title}</p>
                {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
            </div>
            <div className="space-y-4">
                {children}
            </div>
        </section>
    );
};
