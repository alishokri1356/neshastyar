import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const SectionHeader = ({ title, action, className }: SectionHeaderProps) => {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-2', className)}>
      <h2 className="min-w-0 truncate text-sm font-semibold text-muted-foreground">{title}</h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default SectionHeader;
