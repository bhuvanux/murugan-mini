

export function AdLabel({ className = "" }: { className?: string }) {
    return (
        <span className={`text-[10px] font-bold text-gray-400 border border-gray-400/50 px-1 rounded select-none ${className}`}>
            Ad
        </span>
    );
}
