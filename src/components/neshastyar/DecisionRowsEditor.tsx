import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { DecisionRow } from "@/lib/meetingDecisions";

function CellEditor({
  label,
  value,
  rows = 2,
  disabled,
  className = "",
  onSave,
}: {
  label: string;
  value: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const start = () => {
    setDraft(value);
    setError("");
    setOpen(true);
  };

  const save = async () => {
    if (saving || disabled) return;
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره انجام نشد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`relative min-w-0 border-t border-[#E8E2D5] px-3 py-2.5 ${className}`}>
      <p className="mb-1 text-[12px] font-semibold text-[#66625B]">{label}</p>
      <button
        type="button"
        aria-label={`ویرایش ${label}`}
        disabled={disabled || saving}
        onClick={start}
        className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-[#0D4D4D] hover:bg-[#D7EFED] disabled:opacity-40"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="space-y-2 pl-8">
          <textarea
            value={draft}
            rows={rows}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            className="w-full rounded-lg border border-[#E8E2D5] bg-white px-2 py-1.5 text-[14px] leading-6 text-[#1C1B18] focus:border-[#0D4D4D] focus:outline-none"
          />
          {error ? <p className="text-[12px] text-[#B91C1C]">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-[#0D4D4D] px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {saving ? "..." : "ذخیره"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1 text-[12px] text-[#404848] hover:bg-[#F5F2EB]"
            >
              انصراف
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`break-words pl-8 text-[14px] leading-6 ${
            value.trim() ? "text-[#1C1B18]" : "text-[#66625B]"
          }`}
        >
          {value.trim() || "—"}
        </p>
      )}
    </div>
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
    <div className="mt-3 space-y-3">
      {rows.length === 0 ? (
        <p className="text-[14px] text-[#66625B]">نکته‌ای ثبت نشده</p>
      ) : (
        rows.map((row, index) => {
          const hasContent = Boolean(row.text || row.assignee || row.deadline);
          return (
            <article
              key={`${index}:${row.text}:${row.assignee}:${row.deadline}`}
              className="overflow-hidden rounded-xl border border-[#E8E2D5]"
            >
              <div className="flex items-center justify-between bg-[#F5F2EB] px-3 py-2">
                <span className="text-[13px] font-semibold text-[#404848]">ردیف {index + 1}</span>
                <button
                  type="button"
                  aria-label={`حذف ردیف ${index + 1}`}
                  title="حذف ردیف"
                  disabled={disabled || deleting === index}
                  onClick={() => {
                    if (hasContent && !window.confirm(`ردیف ${index + 1} حذف شود؟`)) return;
                    setDeleting(index);
                    void onDelete(index).catch(() => undefined).finally(() => setDeleting(null));
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#B91C1C] hover:bg-[#FDF2F0] disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <CellEditor
                label="تصمیم اتخاذ شده"
                value={row.text}
                rows={3}
                disabled={disabled}
                onSave={(value) => onEdit(index, "text", value)}
              />
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2">
                <CellEditor
                  label="مسئول"
                  value={row.assignee}
                  disabled={disabled}
                  onSave={(value) => onEdit(index, "assignee", value)}
                />
                <CellEditor
                  label="مهلت زمانی"
                  value={row.deadline}
                  disabled={disabled}
                  className="min-[420px]:border-s"
                  onSave={(value) => onEdit(index, "deadline", value)}
                />
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
        className="w-full rounded-xl border border-[#E8E2D5] py-2.5 text-[14px] font-semibold text-[#0D4D4D] disabled:opacity-40"
      >
        {adding ? "..." : "+ افزودن ردیف"}
      </button>
    </div>
  );
}
