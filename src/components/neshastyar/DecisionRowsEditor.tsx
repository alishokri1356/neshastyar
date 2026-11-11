import { useState, type ReactNode } from "react";
import { CalendarClock, Check, ListChecks, Loader2, Plus, Trash2, UserRound, X } from "lucide-react";
import type { DecisionRow } from "@/lib/meetingDecisions";
import { cn } from "@/lib/utils";

function useFieldEditor(value: string, onSave: (value: string) => Promise<void>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const start = () => {
    setDraft(value);
    setError("");
    setEditing(true);
  };

  const cancel = () => {
    if (!saving) setEditing(false);
  };

  const save = async () => {
    if (saving) return;
    if (draft.trim() === value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره انجام نشد");
    } finally {
      setSaving(false);
    }
  };

  return { editing, draft, setDraft, saving, error, start, cancel, save };
}

function EditActions({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="ذخیره"
        disabled={saving}
        onClick={onSave}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D4D4D] text-white transition hover:bg-[#0F766E] disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        type="button"
        aria-label="انصراف"
        disabled={saving}
        onClick={onCancel}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#66625B] transition hover:bg-[#F5F2EB]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function NoteText({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const field = useFieldEditor(value, onSave);

  if (field.editing) {
    return (
      <div className="space-y-2">
        <textarea
          value={field.draft}
          rows={3}
          autoFocus
          placeholder="متن نکته را بنویسید"
          onChange={(event) => field.setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") field.cancel();
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void field.save();
          }}
          className="w-full resize-none rounded-xl border border-[#0D4D4D]/40 bg-[#FBF9F4] px-3 py-2 text-[15px] leading-7 text-[#1C1B18] outline-none ring-[#0D4D4D]/15 focus:ring-4"
        />
        <div className="flex items-center justify-between gap-2">
          {field.error ? <p className="text-[12px] text-[#B91C1C]">{field.error}</p> : <span />}
          <EditActions saving={field.saving} onSave={() => void field.save()} onCancel={field.cancel} />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={field.start}
      className={cn(
        "-mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1 text-right text-[15px] leading-7 transition hover:bg-[#F5F2EB] disabled:hover:bg-transparent",
        value.trim() ? "text-[#1C1B18]" : "text-[#66625B]/80",
      )}
    >
      {value.trim() || "متن نکته را بنویسید"}
    </button>
  );
}

function MetaChip({
  icon,
  label,
  value,
  disabled,
  onSave,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  disabled: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const field = useFieldEditor(value, onSave);
  const filled = Boolean(value.trim());

  if (field.editing) {
    return (
      <div className="flex w-full items-center gap-1.5 rounded-full border border-[#0D4D4D]/40 bg-[#FBF9F4] py-1 pe-1 ps-3 sm:w-auto">
        <span className="text-[#0F766E]">{icon}</span>
        <input
          value={field.draft}
          autoFocus
          placeholder={label}
          onChange={(event) => field.setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") field.cancel();
            if (event.key === "Enter") void field.save();
          }}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1C1B18] outline-none sm:w-40"
        />
        <EditActions saving={field.saving} onSave={() => void field.save()} onCancel={field.cancel} />
        {field.error ? <span className="sr-only">{field.error}</span> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={field.start}
      title={field.error || undefined}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition disabled:opacity-60",
        filled
          ? "bg-[#D7EFED]/70 text-[#0D4D4D] hover:bg-[#D7EFED]"
          : "border border-dashed border-[#B9B2A3] text-[#66625B] hover:border-[#0D4D4D]/50 hover:text-[#0D4D4D]",
        field.error && "ring-1 ring-[#B91C1C]",
      )}
    >
      <span className="shrink-0">{icon}</span>
      {filled ? (
        <>
          <span className="shrink-0 text-[#0D4D4D]/70">{label}:</span>
          <span className="truncate font-semibold">{value}</span>
        </>
      ) : (
        <span>افزودن {label}</span>
      )}
    </button>
  );
}

export function DecisionRowsEditor({
  rows,
  disabled = false,
  onEdit,
  onAdd,
  onDelete,
}: {
  rows: DecisionRow[];
  disabled?: boolean;
  onEdit: (index: number, part: "text" | "assignee" | "deadline", value: string) => Promise<void>;
  onAdd: () => Promise<void>;
  onDelete: (index: number) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#E8E2D5] bg-white px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D7EFED] text-[#0D4D4D]">
            <ListChecks className="h-5 w-5" />
          </span>
          <p className="text-[14px] text-[#66625B]">هنوز نکته‌ای ثبت نشده</p>
        </div>
      ) : (
        rows.map((row, index) => {
          const hasContent = Boolean(row.text || row.assignee || row.deadline);
          return (
            <article
              key={`${index}:${row.text}:${row.assignee}:${row.deadline}`}
              className="group relative rounded-2xl border border-[#E8E2D5] bg-white p-4 shadow-[0_1px_2px_rgba(28,27,24,0.04)] transition hover:border-[#0D4D4D]/25 hover:shadow-[0_6px_18px_rgba(13,77,77,0.08)]"
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0D4D4D] text-[13px] font-bold text-white">
                  {(index + 1).toLocaleString("fa-IR")}
                </span>
                <div className="min-w-0 flex-1">
                  <NoteText
                    value={row.text}
                    disabled={disabled}
                    onSave={(value) => onEdit(index, "text", value)}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetaChip
                      icon={<UserRound className="h-3.5 w-3.5" />}
                      label="مسئول"
                      value={row.assignee}
                      disabled={disabled}
                      onSave={(value) => onEdit(index, "assignee", value)}
                    />
                    <MetaChip
                      icon={<CalendarClock className="h-3.5 w-3.5" />}
                      label="مهلت"
                      value={row.deadline}
                      disabled={disabled}
                      onSave={(value) => onEdit(index, "deadline", value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`حذف نکته ${index + 1}`}
                  title="حذف"
                  disabled={disabled || deleting === index}
                  onClick={() => {
                    if (hasContent && !window.confirm("این نکته حذف شود؟")) return;
                    setDeleting(index);
                    void onDelete(index).catch(() => undefined).finally(() => setDeleting(null));
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#66625B] opacity-70 transition hover:bg-[#FDF2F0] hover:text-[#B91C1C] hover:opacity-100 disabled:opacity-30 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  {deleting === index ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </article>
          );
        })
      )}

      <button
        type="button"
        disabled={disabled || adding}
        onClick={() => {
          setAdding(true);
          void onAdd().catch(() => undefined).finally(() => setAdding(false));
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#0D4D4D]/35 py-3.5 text-[14px] font-semibold text-[#0D4D4D] transition hover:border-[#0D4D4D]/60 hover:bg-[#D7EFED]/40 disabled:opacity-50"
      >
        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        افزودن نکته
      </button>
    </div>
  );
}
