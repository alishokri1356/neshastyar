import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: true | string | (() => void);
  clickableBack?: boolean;
  searchActive?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchClose?: () => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  className?: string;
}

const AppHeader = ({
  title,
  subtitle,
  onBack,
  clickableBack,
  searchActive = false,
  searchValue = "",
  onSearchChange,
  onSearchClose,
  searchPlaceholder = "جستجو...",
  actions,
  leading,
  className,
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    if (typeof onBack === "function") return onBack();
    if (typeof onBack === "string") return navigate(onBack);
    navigate(-1);
  };

  useEffect(() => {
    if (searchActive) {
      searchInputRef.current?.focus();
    }
  }, [searchActive]);

  const titleContent = searchActive ? (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        ref={searchInputRef}
        value={searchValue}
        onChange={(event) => onSearchChange?.(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="h-11 w-full rounded-[14px] border border-[#E8E2D5] bg-[#F5F2EB] px-3.5 text-[15px] text-[#1C1B18] placeholder:text-[#66625B] focus:border-[#0D4D4D] focus:outline-none"
      />
      <button
        type="button"
        onClick={onSearchClose}
        aria-label="بستن جستجو"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#66625B] hover:bg-black/5"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  ) : leading ? (
    leading
  ) : onBack && clickableBack ? (
    <button
      type="button"
      onClick={handleBack}
      aria-label="بازگشت"
      className="-mr-2 flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-start transition-colors hover:bg-black/5"
    >
      <ArrowRight className="h-5 w-5 shrink-0 text-[#0D4D4D]" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[18px] font-bold leading-tight text-[#1C1B18]">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-[#66625B]">{subtitle}</p>
        )}
      </div>
    </button>
  ) : (
    <>
      {onBack && (
        <button
          type="button"
          onClick={handleBack}
          aria-label="بازگشت"
          className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0D4D4D] transition hover:bg-black/5"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[18px] font-bold leading-tight text-[#1C1B18]">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-[#66625B]">{subtitle}</p>
        )}
      </div>
    </>
  );

  return (
    <div className={cn("w-full bg-[#FBF9F4]", className)}>
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-2">
        {titleContent}
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </div>
  );
};

export default AppHeader;
