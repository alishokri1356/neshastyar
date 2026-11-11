import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { DecisionRow } from "@/lib/meetingDecisions";

function CellEditor({
  label,
  value,
  rows = 2,
  disabled,
  onSave,
}: {
  label: string;
  value: string;
  rows?: number;
  disabled?: boolean;
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
    <td className="relative border border-[#E8E2D5] px-2 py-2 align-top">
      <button
        type="button"
        aria-label={`ویرایش ${label}`}
        disabled={disabled || saving}
        onClick={start}
        className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[#0D4D4D] hover:bg-[#D7EFED] disabled:opacity-40"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="space-y-2 pl-7">
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
        <p className={`whitespace-pre-wrap pl-7 text-[14px] leading-6 ${value.trim() ? "text-[#1C1B18]" : "text-[#66625B]"}`}>
          {value.trim() || "—"}
        </p>
      )}
    </td>
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
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-right">
        <thead>
          <tr className="bg-[#F5F2EB] text-[13px] font-semibold text-[#404848]">
            <th className="w-14 border border-[#E8E2D5] px-2 py-2">ردیف</th>
            <th className="border border-[#E8E2D5] px-2 py-2">تصمیم اتخاذ شده</th>
            <th className="w-36 border border-[#E8E2D5] px-2 py-2">مسئول</th>
            <th className="w-36 border border-[#E8E2D5] px-2 py-2">مهلت زمانی</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="border border-[#E8E2D5] px-3 py-4 text-[14px] text-[#66625B]">
                نکته‌ای ثبت نشده
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const hasContent = Boolean(row.text || row.assignee || row.deadline);
              return (
                <tr key={`${index}:${row.text}:${row.assignee}:${row.deadline}`}>
                  <td className="border border-[#E8E2D5] px-2 py-2 text-center align-top text-[14px] text-[#1C1B18]">
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
                      className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-[#B91C1C] hover:bg-[#FDF2F0] disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {index + 1}
                  </td>
                  <CellEditor
                    label="تصمیم اتخاذ شده"
                    value={row.text}
                    rows={3}
                    disabled={disabled}
                    onSave={(value) => onEdit(index, "text", value)}
                  />
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
                    onSave={(value) => onEdit(index, "deadline", value)}
                  />
                </tr>
              );
            })
          )}
          <tr>
            <td colSpan={4} className="border border-[#E8E2D5] px-2 py-2 text-center">
              <button
                type="button"
                disabled={disabled || adding}
                onClick={() => {
                  setAdding(true);
                  void onAdd().catch(() => undefined).finally(() => setAdding(false));
                }}
                className="text-[14px] font-semibold text-[#0D4D4D] disabled:opacity-40"
              >
                {adding ? "..." : "+ افزودن ردیف"}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
