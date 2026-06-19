import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** If provided, shows a back button. `true` navigates -1, a string navigates to that path, a function is called. */
  onBack?: true | string | (() => void);
  /** When true, the title area (not actions) becomes one clickable back control instead of a separate icon button. */
  clickableBack?: boolean;
  searchActive?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchClose?: () => void;
  searchPlaceholder?: string;
  /** Right-aligned actions (buttons, menus). Keep to 1-2 compact items on mobile. */
  actions?: React.ReactNode;
  /** Optional leading element shown instead of the back button (e.g. a brand logo). */
  leading?: React.ReactNode;
  className?: string;
}

const AppHeader = ({
  title,
  subtitle,
  onBack,
  clickableBack,
  searchActive = false,
  searchValue = '',
  onSearchChange,
  onSearchClose,
  searchPlaceholder = 'جستجو...',
  actions,
  leading,
  className,
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    if (typeof onBack === 'function') return onBack();
    if (typeof onBack === 'string') return navigate(onBack);
    navigate(-1);
  };

  useEffect(() => {
    if (searchActive) {
      searchInputRef.current?.focus();
    }
  }, [searchActive]);

  const titleContent = searchActive ? (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Input
        ref={searchInputRef}
        value={searchValue}
        onChange={(event) => onSearchChange?.(event.target.value)}
        placeholder={searchPlaceholder}
        className="h-9 border-border/60 bg-background/80"
        aria-label={searchPlaceholder}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onSearchClose}
        aria-label="بستن جستجو"
        className="shrink-0"
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  ) : leading ? (
    leading
  ) : onBack && clickableBack ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label="بازگشت"
            className="-ms-2 flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-start transition-colors hover:bg-muted/50 active:bg-muted/70"
          >
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold leading-tight text-foreground sm:text-lg">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </button>
        ) : (
          <>
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                aria-label="بازگشت"
                className="-ms-2 shrink-0"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold leading-tight text-foreground sm:text-lg">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </>
        );

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg safe-top',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3">
        {titleContent}

        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  );
};

export default AppHeader;
