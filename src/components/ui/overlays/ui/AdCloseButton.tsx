
import { X } from 'lucide-react';

interface AdCloseButtonProps {
    onClose: () => void;
    className?: string;
    iconColor?: string;
}

export function AdCloseButton({ onClose, className = "", iconColor = "text-black" }: AdCloseButtonProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
            className={`p-2 bg-gray-100/80 backdrop-blur-sm rounded-full hover:bg-gray-200 transition-colors shadow-sm active:scale-95 z-50 ${className}`}
            aria-label="Close Ad"
        >
            <X size={20} className={iconColor} />
        </button>
    );
}
