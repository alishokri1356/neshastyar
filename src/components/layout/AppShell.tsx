import React from "react";
import AppHeader from "./AppHeader";
import BottomNav from "./BottomNav";
import { NeshastyarTopBar } from "@/components/neshastyar/NeshastyarUi";
import { cn } from "@/lib/utils";

interface AppShellProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: true | string | (() => void);
  /** When true, the header title area becomes one clickable back control. */
  clickableBack?: boolean;
  searchActive?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchClose?: () => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  /** Hide the bottom navigation (matches Android default on secondary screens). */
  hideNav?: boolean;
  /** Hide the default header (page provides its own). */
  hideHeader?: boolean;
  /** Hide the Android NeshastyarTopBar ("نشست یار" + search + home icon). */
  hideTopBar?: boolean;
  /** Constrain and pad the content. Set false for edge-to-edge pages. */
  contained?: boolean;
  bottomBar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const AppShell = ({
  title,
  subtitle,
  onBack,
  clickableBack,
  searchActive,
  searchValue,
  onSearchChange,
  onSearchClose,
  searchPlaceholder,
  actions,
  leading,
  hideNav = false,
  hideHeader = false,
  hideTopBar = false,
  contained = true,
  bottomBar,
  children,
  className,
  contentClassName,
}: AppShellProps) => {
  return (
    <div
      dir="rtl"
      className={cn("min-h-[100dvh] bg-[#FBF9F4] text-[#1C1B18]", className)}
    >
      {!hideTopBar && <NeshastyarTopBar />}

      {!hideHeader && (
        <AppHeader
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          clickableBack={clickableBack}
          searchActive={searchActive}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onSearchClose={onSearchClose}
          searchPlaceholder={searchPlaceholder}
          actions={actions}
          leading={leading}
        />
      )}

      <main
        className={cn(
          bottomBar || !hideNav ? "pb-nav" : "pb-safe",
          contained && "mx-auto w-full max-w-2xl px-4 py-3",
          contentClassName,
        )}
      >
        {children}
      </main>

      {bottomBar ? bottomBar : !hideNav ? <BottomNav /> : null}
    </div>
  );
};

export default AppShell;
