import React from "react";
import { cn } from "../../components/ui/utils";
import { Skeleton } from "../../components/ui/skeleton";

type Props = {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  skeleton?: React.ReactNode;
};

function DefaultSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function SkeletonWrapper({ loading, children, className, skeleton }: Props) {
  if (!loading) return <>{children}</>;

  return <div className={cn("w-full", className)}>{skeleton ?? <DefaultSkeleton />}</div>;
}
