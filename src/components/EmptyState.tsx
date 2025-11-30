import React from 'react';
import { Button } from './ui/button';
import { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="bg-orange-500 hover:bg-orange-600">
          {action.label}
        </Button>
      )}
    </div>
  );
}
