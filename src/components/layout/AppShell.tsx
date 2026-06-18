import React from 'react';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import { cn } from '@/lib/utils';

interface AppShellProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: true | string | (() => void);
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  /** Hide the bottom navigation (e.g. full-screen flows like recording). */
  hideNav?: boolean;
  /** Hide the default header (page provides its own). */
  hideHeader?: boolean;
  /** Constrain and pad the content. Set false for edge-to-edge pages. */
  contained?: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const AppShell = ({
  title,
  subtitle,
  onBack,
  actions,
  leading,
  hideNav = false,
  hideHeader = false,
  contained = true,
  children,
  className,
  contentClassName,
}: AppShellProps) => {
  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10',
        className,
      )}
    >
      {!hideHeader && (
        <AppHeader
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          actions={actions}
          leading={leading}
        />
      )}

      <main
        className={cn(
          hideNav ? 'pb-safe' : 'pb-nav',
          contained && 'mx-auto w-full max-w-3xl px-4 py-5',
          contentClassName,
        )}
      >
        {children}
      </main>

      {!hideNav && <BottomNav />}
    </div>
  );
};

export default AppShell;
