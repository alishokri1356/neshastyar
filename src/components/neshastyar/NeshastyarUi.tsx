import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Home as HomeIcon, Loader2, MoreVertical, Search } from "lucide-react";
import { MeetingShareButton } from "@/components/neshastyar/MeetingShareButton";
import { cn } from "@/lib/utils";
import {
  formatJalaliDateTime,
  isAnalyzingStatus,
  statusChipColors,
  statusDisplayLabel,
} from "@/lib/neshastyarStatus";

export function NeshastyarTopBar({
  onSearch,
  onHome,
  className,
}: {
  onSearch?: () => void;
  onHome?: () => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meetingId = pathname.match(/^\/meeting\/([^/]+)/)?.[1];

  return (
    <header
      dir="rtl"
      className={cn(
        "sticky top-0 z-40 w-full bg-[#FBF9F4]/95 backdrop-blur-sm safe-top",
        className,
      )}
    >
      <div className="relative mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-3">
        {meetingId ? (
          <MeetingShareButton meetingId={meetingId} />
        ) : (
          <button
            type="button"
            onClick={onSearch ?? (() => navigate("/search"))}
            aria-label="جستجو"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#0D4D4D] transition hover:bg-[#0D4D4D]/10"
          >
            <Search className="h-[24px] w-[24px]" />
          </button>
        )}

        <span className="pointer-events-none absolute inset-x-16 text-center text-[21px] font-bold text-[#0D4D4D]">
          نشست یار
        </span>

        <button
          type="button"
          onClick={
            meetingId
              ? () => navigate(`/meeting/${meetingId}/options`)
              : (onHome ?? (() => navigate("/home")))
          }
          aria-label={meetingId ? "گزینه‌ها" : "خانه"}
          className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#0D4D4D] text-white shadow-sm transition hover:bg-[#0F766E] active:scale-95"
        >
          {meetingId ? (
            <MoreVertical className="h-[21px] w-[21px]" />
          ) : (
            <HomeIcon className="h-[21px] w-[21px]" />
          )}
        </button>
      </div>
    </header>
  );
}

export function NeshastyarSubHeader({
  title,
  onBack,
  actions,
  className,
}: {
  title?: React.ReactNode;
  onBack?: true | string | (() => void);
  actions?: React.ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof onBack === "function") return onBack();
    if (typeof onBack === "string") return navigate(onBack);
    navigate(-1);
  };

  return (
    <div
      dir="rtl"
      className={cn("flex w-full items-center gap-1 py-1.5", className)}
    >
      {onBack ? (
        <button
          type="button"
          onClick={handleBack}
          aria-label="بازگشت"
          className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1C1B18] transition hover:bg-black/5"
        >
          <ArrowRight className="h-5 w-5 text-[#0D4D4D]" />
        </button>
      ) : null}

      {title ? (
        <h1 className="min-w-0 flex-1 truncate text-[18px] font-bold text-[#1C1B18]">
          {title}
        </h1>
      ) : (
        <div className="flex-1" />
      )}

      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  );
}

export function NeshastyarCard({
  children,
  accentBar = false,
  onClick,
  className,
}: {
  children: React.ReactNode;
  accentBar?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const Comp = onClick ? "div" : "div";
  return (
    <Comp
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "w-full rounded-[16px] border bg-white p-4 transition",
        accentBar ? "border-[#0D4D4D]/45" : "border-[#E8E2D5]",
        onClick && "cursor-pointer hover:border-[#0D4D4D]/35 active:scale-[0.995]",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function NeshastyarPrimaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  icon,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#0D4D4D] px-5 text-[15px] font-semibold text-white transition hover:bg-[#0F766E] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#0D4D4D]/40",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-[22px] w-[22px] animate-spin text-white" />
      ) : (
        <>
          {icon}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

export function NeshastyarSecondaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  icon,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#0D4D4D]/55 bg-transparent px-4 text-[15px] font-medium text-[#0F766E] transition hover:bg-[#D7EFED]/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function NeshastyarField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  dir = "rtl",
  multiline = false,
  rows = 3,
  disabled = false,
  required = false,
  autoFocus = false,
  leadingIcon,
  trailingIcon,
  onKeyDown,
  id,
  className,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "rtl" | "ltr";
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <label
          htmlFor={id}
          className="mb-1.5 block text-right text-[12px] font-medium text-[#66625B]"
        >
          {label}
        </label>
      ) : null}
      <div className="relative flex items-center">
        {leadingIcon ? (
          <div className="pointer-events-none absolute right-3.5 flex items-center text-[#0F766E]">
            {leadingIcon}
          </div>
        ) : null}

        {multiline ? (
          <textarea
            id={id}
            rows={rows}
            dir={dir}
            value={value}
            disabled={disabled}
            required={required}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onKeyDown={onKeyDown}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "w-full rounded-[14px] border border-[#E8E2D5] bg-[#F5F2EB] px-4 py-3 text-[15px] leading-7 text-[#1C1B18] placeholder:text-[#66625B]/75 focus:border-[#0D4D4D] focus:outline-none focus:ring-1 focus:ring-[#0D4D4D] disabled:bg-white disabled:opacity-60",
              leadingIcon && "pr-11",
              trailingIcon && "pl-12",
              dir === "ltr" && "text-left",
            )}
          />
        ) : (
          <input
            id={id}
            type={type}
            dir={dir}
            value={value}
            disabled={disabled}
            required={required}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onKeyDown={onKeyDown}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "h-[52px] w-full rounded-[14px] border border-[#E8E2D5] bg-[#F5F2EB] px-4 text-[15px] text-[#1C1B18] placeholder:text-[#66625B]/75 focus:border-[#0D4D4D] focus:outline-none focus:ring-1 focus:ring-[#0D4D4D] disabled:bg-white disabled:opacity-60",
              leadingIcon && "pr-11",
              trailingIcon && "pl-12",
              dir === "ltr" && "text-left",
            )}
          />
        )}

        {trailingIcon ? (
          <div className="absolute left-2.5 flex items-center">{trailingIcon}</div>
        ) : null}
      </div>
    </div>
  );
}

export function StatusChip({ status }: { status?: string | null }) {
  const { bg, text } = statusChipColors(status);
  return (
    <span
      style={{ backgroundColor: bg, color: text }}
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none"
    >
      {statusDisplayLabel(status)}
    </span>
  );
}

export function NeshastyarSectionHeader({
  title,
  subtitle,
  icon,
  iconColor = "#0F766E",
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon ? <span style={{ color: iconColor }}>{icon}</span> : null}
      <div>
        <h2 className="text-[16px] font-semibold text-[#1C1B18]">{title}</h2>
        {subtitle ? <p className="text-[12px] text-[#66625B]">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function MeetingListCard({
  title,
  status,
  meetingDate,
  createdAt,
  onClick,
}: {
  title?: string | null;
  status?: string | null;
  meetingDate?: string | null;
  createdAt?: string | null;
  onClick: () => void;
}) {
  const whenText = formatJalaliDateTime(meetingDate || createdAt);
  const analyzing = isAnalyzingStatus(status);

  return (
    <NeshastyarCard
      accentBar={analyzing}
      onClick={onClick}
      className="p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="line-clamp-2 flex-1 text-[15px] font-semibold text-[#1C1B18]">
          {title?.trim() ? title : "جلسه"}
        </span>
        <StatusChip status={status} />
      </div>
      {whenText ? (
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#66625B]">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{whenText}</span>
        </div>
      ) : null}
    </NeshastyarCard>
  );
}
