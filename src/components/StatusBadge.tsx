import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Status = 'pending' | 'approved' | 'rejected' | 'completed';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center justify-center",
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
