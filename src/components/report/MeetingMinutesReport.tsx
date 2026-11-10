import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MeetingReportData, ReportEdit } from '@/lib/meetingReport';
import { formatReportDate } from '@/lib/meetingReport';

interface MeetingMinutesReportProps {
  report: MeetingReportData;
  onSave?: (edit: ReportEdit) => Promise<void>;
  onUploadLogo?: (file: File) => Promise<void>;
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.7 1.3a1.5 1.5 0 0 1 2.1 2.1l-8.2 8.2-2.8.7.7-2.8 8.2-8.2Zm1.4 1.4-.7.7 1.4 1.4.7-.7a.5.5 0 0 0-.7-.7l-.7-.7ZM10.6 4.1 3.6 11.1l-.3 1.4 1.4-.3 7-7-1.1-1.1Z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 1.5h4l.5 1H13a.5.5 0 0 1 0 1h-.6l-.7 9.6a1.5 1.5 0 0 1-1.5 1.4H5.8a1.5 1.5 0 0 1-1.5-1.4L3.6 3.5H3a.5.5 0 0 1 0-1h2.5l.5-1Zm-1.4 2 .7 9.5c0 .3.2.5.5.5h4.4c.3 0 .5-.2.5-.5l.7-9.5H4.6ZM6.5 5.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 0a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Z"
      />
    </svg>
  );
}

function DecisionIndexCell({
  index,
  hasContent,
  onDelete,
}: {
  index: number;
  hasContent: boolean;
  onDelete?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    if (!onDelete || busy) return;
    if (hasContent && !window.confirm(`ردیف ${index} حذف شود؟`)) return;
    setBusy(true);
    setError('');
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ردیف انجام نشد');
    } finally {
      setBusy(false);
    }
  };

  return (
    <td className="index-cell">
      {onDelete ? (
        <button
          type="button"
          className="row-delete"
          aria-label={`حذف ردیف ${index}`}
          title="حذف ردیف"
          onClick={remove}
          disabled={busy}
        >
          <TrashIcon />
        </button>
      ) : null}
      {index}
      {error ? <p className="cell-error">{error}</p> : null}
    </td>
  );
}

const ADD_ROW_LABEL = '+ افزودن ردیف';

function AddDecisionRow({ onAdd }: { onAdd: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onAdd();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'افزودن ردیف انجام نشد');
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="add-row">
      <td colSpan={9}>
        <button type="button" onClick={add} disabled={busy}>{busy ? '...' : ADD_ROW_LABEL}</button>
        {error ? <p className="cell-error">{error}</p> : null}
      </td>
    </tr>
  );
}

function EditableCell({
  value,
  onSave,
  children,
  colSpan,
  className,
  style,
  rows = 2,
  placeholder,
}: {
  value: string;
  onSave?: (value: string) => Promise<void>;
  children: React.ReactNode;
  colSpan?: number;
  className?: string;
  style?: React.CSSProperties;
  rows?: number;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const start = () => {
    setDraft(value);
    setError('');
    setOpen(true);
  };

  const save = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره انجام نشد');
    } finally {
      setSaving(false);
    }
  };

  return (
    <td className={className ? `${className} data-cell` : 'data-cell'} colSpan={colSpan} style={style}>
      {onSave ? (
        <button type="button" className="cell-edit" aria-label="ویرایش" onClick={start}>
          <PencilIcon />
        </button>
      ) : null}
      {open ? (
        <div className="cell-editor">
          <textarea
            value={draft}
            rows={rows}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false);
            }}
            autoFocus
          />
          {error ? <p className="cell-error">{error}</p> : null}
          <div className="cell-actions">
            <button type="button" onClick={save} disabled={saving}>{saving ? '...' : 'ذخیره'}</button>
            <button type="button" onClick={() => setOpen(false)} disabled={saving}>انصراف</button>
          </div>
        </div>
      ) : children}
    </td>
  );
}

type MinutesRow =
  | { kind: 'decisions-title' }
  | { kind: 'columns' }
  | { kind: 'decision'; index: number; text: string; assignee: string; deadline: string; continued?: boolean }
  | { kind: 'add-row' };

const COLS = (
  <colgroup>
    <col style={{ width: '7.4%' }} />
    <col style={{ width: '5.5%' }} />
    <col style={{ width: '12.8%' }} />
    <col style={{ width: '24.3%' }} />
    <col style={{ width: '10.1%' }} />
    <col style={{ width: '12.9%' }} />
    <col style={{ width: '1.3%' }} />
    <col style={{ width: '12.2%' }} />
    <col style={{ width: '13.5%' }} />
  </colgroup>
);

function LogoCell({
  logoUrl,
  orgName,
  onUpload,
}: {
  logoUrl: string | null;
  orgName: string | null;
  onUpload?: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pick = async (file?: File) => {
    if (!file || !onUpload) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم لوگو باید کمتر از ۲ مگابایت باشد');
      return;
    }
    setUploading(true);
    setError('');
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره لوگو انجام نشد');
    } finally {
      setUploading(false);
    }
  };

  return (
    <td className="logo-cell" colSpan={2}>
      {onUpload ? (
        <>
          <button
            type="button"
            className="cell-edit"
            aria-label="بارگذاری لوگو"
            onClick={() => inputRef.current?.click()}
          >
            <PencilIcon />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              void pick(file);
            }}
          />
        </>
      ) : null}
      {logoUrl ? <img src={logoUrl} alt={orgName || 'لوگوی سازمان'} /> : null}
      {uploading ? <span className="logo-status">...</span> : null}
      {error ? <p className="cell-error">{error}</p> : null}
    </td>
  );
}

function HeaderTable({
  report,
  onSave,
  onUploadLogo,
}: {
  report: MeetingReportData;
  onSave?: (edit: ReportEdit) => Promise<void>;
  onUploadLogo?: (file: File) => Promise<void>;
}) {
  const dateText = formatReportDate(report.meetingDate);
  return (
    <table className="block">
      {COLS}
      <thead>
        <tr>
          <EditableCell
            className="title-cell"
            colSpan={7}
            value={report.orgName || ''}
            rows={1}
            placeholder="نام سازمان"
            onSave={onSave ? (value) => onSave({ field: 'orgName', value }) : undefined}
          >
            صورتجلسه سازمانی
            {report.orgName ? <span className="org-name">{report.orgName}</span> : null}
          </EditableCell>
          <LogoCell logoUrl={report.logoUrl} orgName={report.orgName} onUpload={onUploadLogo} />
        </tr>
        <tr>
          <td className="shade" colSpan={2}>عنوان جلسه</td>
          <EditableCell
            colSpan={7}
            value={report.title}
            rows={2}
            onSave={onSave ? (value) => onSave({ field: 'title', value }) : undefined}
          >
            {report.title}
          </EditableCell>
        </tr>
        <tr>
          <td className="shade" colSpan={2}>تاریخ و ساعت تشکیل جلسه</td>
          <EditableCell
            colSpan={3}
            value={dateText}
            rows={1}
            placeholder="1405/08/11 - 16:54"
            onSave={onSave ? (value) => onSave({ field: 'date', value }) : undefined}
          >
            {dateText}
          </EditableCell>
          <td className="shade" colSpan={2}>محل تشکیل جلسه</td>
          <EditableCell
            colSpan={2}
            value={report.location || ''}
            rows={2}
            onSave={onSave ? (value) => onSave({ field: 'location', value }) : undefined}
          >
            {report.location}
          </EditableCell>
        </tr>
        <tr>
          <td className="shade" colSpan={2}>اسامی حاضران</td>
          <EditableCell
            colSpan={7}
            value={report.participants.join('، ')}
            rows={3}
            onSave={onSave ? (value) => onSave({ field: 'participants', value }) : undefined}
          >
            {report.participants.join('، ')}
          </EditableCell>
        </tr>
      </thead>
    </table>
  );
}

function FooterTable() {
  return (
    <table className="block footer-table">
      {COLS}
      <tbody>
        <tr>
          <td className="shade" colSpan={2}>امضاء حاضران</td>
          <td className="signature-space" colSpan={7} />
        </tr>
      </tbody>
    </table>
  );
}

function RowView({ row, report, onSave }: {
  row: MinutesRow;
  report: MeetingReportData;
  onSave?: (edit: ReportEdit) => Promise<void>;
}) {
  if (row.kind === 'decisions-title') {
    return (
      <tr>
        <td className="shade" colSpan={9}>خلاصه تصمیمات</td>
      </tr>
    );
  }
  if (row.kind === 'columns') {
    return (
      <tr>
        <td className="shade">ردیف</td>
        <td className="shade" colSpan={5}>تصمیم اتخاذ شده</td>
        <td className="shade" colSpan={2}>مسئول اجرا</td>
        <td className="shade">مهلت زمانی</td>
      </tr>
    );
  }
  if (row.kind === 'add-row') {
    return onSave ? <AddDecisionRow onAdd={() => onSave({ field: 'addDecision' })} /> : null;
  }
  const full = report.decisions[row.index - 1] || row;
  const savePart = (part: 'text' | 'assignee' | 'deadline') => (
    onSave ? (value: string) => onSave({ field: 'decision', index: row.index - 1, part, value }) : undefined
  );
  return (
    <tr>
      <DecisionIndexCell
        index={row.index}
        hasContent={Boolean(full.text || full.assignee || full.deadline)}
        onDelete={onSave && !row.continued
          ? () => onSave({ field: 'deleteDecision', index: row.index - 1 })
          : undefined}
      />
      <EditableCell colSpan={5} value={full.text} rows={3} onSave={savePart('text')}>{row.text}</EditableCell>
      <EditableCell colSpan={2} value={full.assignee} rows={2} onSave={savePart('assignee')}>{row.assignee}</EditableCell>
      <EditableCell value={full.deadline} rows={2} onSave={savePart('deadline')}>{row.deadline}</EditableCell>
    </tr>
  );
}

function cell(text: string, span: number, className?: string) {
  const td = document.createElement('td');
  if (span > 1) td.colSpan = span;
  if (className) td.className = className;
  td.textContent = text;
  return td;
}

function buildTr(row: MinutesRow) {
  const tr = document.createElement('tr');
  if (row.kind === 'decisions-title') {
    tr.appendChild(cell('خلاصه تصمیمات', 9, 'shade'));
  } else if (row.kind === 'columns') {
    tr.append(
      cell('ردیف', 1, 'shade'),
      cell('تصمیم اتخاذ شده', 5, 'shade'),
      cell('مسئول اجرا', 2, 'shade'),
      cell('مهلت زمانی', 1, 'shade'),
    );
  } else if (row.kind === 'add-row') {
    tr.className = 'add-row';
    const td = cell('', 9);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = ADD_ROW_LABEL;
    td.appendChild(button);
    tr.appendChild(td);
  } else {
    const index = cell(String(row.index), 1);
    index.style.textAlign = 'center';
    tr.append(index, cell(row.text, 5), cell(row.assignee, 2), cell(row.deadline, 1));
  }
  return tr;
}

function sourceRows(report: MeetingReportData, editable: boolean): MinutesRow[] {
  const rows: MinutesRow[] = [
    { kind: 'decisions-title' },
    { kind: 'columns' },
  ];
  report.decisions.forEach((decision, index) => {
    rows.push({
      kind: 'decision',
      index: index + 1,
      text: decision.text,
      assignee: decision.assignee,
      deadline: decision.deadline,
    });
  });
  if (editable) rows.push({ kind: 'add-row' });
  return rows;
}

function wordParts(text: string) {
  return text.split(/(\s+)/).filter((part) => part.length > 0);
}

const MeetingMinutesReport: React.FC<MeetingMinutesReportProps> = ({ report, onSave, onUploadLogo }) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLTableSectionElement>(null);
  const pageProbeRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<MinutesRow[][] | null>(null);
  const editable = Boolean(onSave);
  const contentKey = useMemo(() => JSON.stringify({
    title: report.title,
    meetingDate: report.meetingDate,
    location: report.location,
    orgName: report.orgName,
    logoUrl: report.logoUrl,
    participants: report.participants,
    decisions: report.decisions,
  }), [report]);

  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const header = headerRef.current;
      const footer = footerRef.current;
      const probe = probeRef.current;
      const pageProbe = pageProbeRef.current;
      if (!header || !footer || !probe || !pageProbe || cancelled) return;
      const table = probe.closest('table');
      if (!table) return;

      const pagePx = pageProbe.offsetHeight;
      const sheet = header.closest('.sheet');
      const sheetStyle = sheet ? getComputedStyle(sheet) : null;
      const padTop = sheetStyle ? parseFloat(sheetStyle.paddingTop) || 0 : 0;
      const padBottom = sheetStyle ? parseFloat(sheetStyle.paddingBottom) || 0 : 0;
      const available = pagePx - padTop - padBottom - header.offsetHeight - footer.offsetHeight - 8;
      const rows = sourceRows(report, editable);

      const heightOf = (group: MinutesRow[]) => {
        probe.replaceChildren(...group.map(buildTr));
        return table.offsetHeight;
      };

      if (available < 80) {
        setPages([rows]);
        probe.replaceChildren();
        return;
      }

      const queue = rows.slice();
      const nextPages: MinutesRow[][] = [];
      while (queue.length && nextPages.length < 40) {
        const page: MinutesRow[] = [];
        while (queue.length) {
          const row = queue[0];
          if (row.kind === 'decisions-title' && page.length) {
            const follow = queue.slice(0, Math.min(3, queue.length));
            if (heightOf([...page, ...follow]) > available) break;
          }
          if (heightOf([...page, row]) <= available) {
            page.push(row);
            queue.shift();
            continue;
          }
          const alone = heightOf([row]);
          if (page.length && alone <= available) break;
          if (row.kind !== 'decision') {
            if (page.length) break;
            page.push(queue.shift() as MinutesRow);
            break;
          }
          const parts = wordParts(row.text);
          let best = 1;
          let lo = 1;
          let hi = parts.length;
          const fits = (count: number) => heightOf([
            ...page,
            { ...row, text: parts.slice(0, count).join('') },
          ]) <= available;
          if (fits(1)) {
            while (lo <= hi) {
              const mid = Math.ceil((lo + hi) / 2);
              if (fits(mid)) {
                best = mid;
                lo = mid + 1;
              } else {
                hi = mid - 1;
              }
            }
          }
          const chunk = parts.slice(0, best).join('').trim();
          const rest = parts.slice(best).join('').trim();
          if (chunk) page.push({ ...row, text: chunk });
          if (rest) queue[0] = { ...row, text: rest, continued: true };
          else queue.shift();
          break;
        }
        if (!page.length && queue.length) page.push(queue.shift() as MinutesRow);
        nextPages.push(page);
      }
      probe.replaceChildren();
      if (!cancelled) setPages(nextPages.length ? nextPages : [rows]);
    };

    measure();
    const fonts = document.fonts;
    fonts?.ready.then(() => measure());
    const image = headerRef.current?.querySelector('img');
    if (image && !image.complete) image.addEventListener('load', measure, { once: true });
    return () => {
      cancelled = true;
    };
  }, [contentKey, report, editable]);

  const visiblePages = pages ?? [sourceRows(report, editable)];

  return (
    <div className="minutes-root" dir="rtl" data-page-count={visiblePages.length}>
      <style>{`
        .minutes-root {
          position: relative;
          width: 210mm;
          margin: 0 auto;
          color: #111;
          font-family: Vazirmatn, Tahoma, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .minutes-root table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .minutes-root td {
          border: 1px solid #111;
          padding: 6px 8px;
          vertical-align: middle;
          font-size: 13px;
          line-height: 1.7;
          word-break: break-word;
        }
        .minutes-root .data-cell {
          position: relative;
          padding-left: 20px;
        }
        .minutes-root .cell-edit {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          padding: 0;
          border: 0;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.92);
          color: #333;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .minutes-root .cell-edit svg,
        .minutes-root .row-delete svg {
          width: 11px;
          height: 11px;
        }
        .minutes-root .index-cell {
          position: relative;
          text-align: center;
        }
        .minutes-root .row-delete {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          padding: 0;
          border: 0;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.92);
          color: #9b1c1c;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .minutes-root .add-row td {
          border: 0;
          padding: 6px 0 0;
          text-align: center;
        }
        .minutes-root .add-row button {
          border: 1px dashed #666;
          background: #fff;
          font: inherit;
          font-size: 12px;
          padding: 2px 14px;
          cursor: pointer;
        }
        .minutes-root .cell-editor textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #666;
          font: inherit;
          line-height: 1.7;
          padding: 2px 4px;
          resize: vertical;
          background: #fff;
        }
        .minutes-root .cell-actions {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }
        .minutes-root .cell-actions button {
          border: 1px solid #111;
          background: #fff;
          font: inherit;
          font-size: 12px;
          padding: 1px 8px;
          cursor: pointer;
        }
        .minutes-root .cell-error {
          margin: 4px 0 0;
          color: #9b1c1c;
          font-size: 11px;
        }
        .minutes-root .shade {
          background: #d9d9d9;
          font-weight: 700;
          text-align: center;
        }
        .minutes-root .title-cell {
          text-align: center;
          font-weight: 800;
          font-size: 22px;
          line-height: 1.5;
          height: 96px;
        }
        .minutes-root .org-name {
          display: block;
          margin-top: 4px;
          font-size: 13px;
          font-weight: 600;
        }
        .minutes-root .logo-cell {
          position: relative;
          text-align: center;
          background: #fff;
        }
        .minutes-root .logo-cell img {
          max-width: 100%;
          max-height: 78px;
          object-fit: contain;
        }
        .minutes-root .logo-status {
          display: block;
          font-size: 11px;
        }
        .minutes-root .signature-space { height: 72px; }
        .sheet {
          width: 210mm;
          height: 297mm;
          box-sizing: border-box;
          padding: 8mm;
          display: flex;
          flex-direction: column;
          background: #fff;
          margin: 0 auto 8mm;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.16);
          overflow: hidden;
          break-inside: avoid;
          page-break-inside: avoid;
          break-after: page;
          page-break-after: always;
        }
        .sheet:last-child {
          break-after: auto;
          page-break-after: auto;
        }
        .sheet .grow { flex: 1 1 auto; }
        .sheet > table + table,
        .sheet .footer-table { margin-top: -1px; }
        .measurer {
          position: absolute;
          left: 0;
          top: 0;
          width: 210mm;
          visibility: hidden;
          pointer-events: none;
        }
        .measurer .sheet {
          height: auto;
          min-height: 0;
          margin: 0;
          box-shadow: none;
          overflow: visible;
        }
        .page-probe {
          position: absolute;
          width: 210mm;
          height: 297mm;
          visibility: hidden;
          pointer-events: none;
        }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          .minutes-root { width: auto; margin: 0; }
          .sheet {
            margin: 0;
            box-shadow: none;
          }
          .measurer, .page-probe, .cell-edit, .cell-editor, .row-delete, .add-row { display: none !important; }
        }
      `}</style>

      <div className="measurer" aria-hidden="true">
        <div className="sheet">
          <div ref={headerRef}>
            <HeaderTable report={report} />
          </div>
          <table className="block">
            {COLS}
            <tbody ref={probeRef} />
          </table>
          <div ref={footerRef}>
            <FooterTable />
          </div>
        </div>
      </div>
      <div className="page-probe" ref={pageProbeRef} />

      {visiblePages.map((pageRows, pageIndex) => (
        <section className="sheet" key={`page-${pageIndex}`} data-page={pageIndex + 1}>
          <HeaderTable report={report} onSave={onSave} onUploadLogo={onUploadLogo} />
          <table className="block">
            {COLS}
            <tbody>
              {pageRows.map((row, rowIndex) => (
                <RowView
                  key={`${pageIndex}-${row.kind}-${rowIndex}`}
                  row={row}
                  report={report}
                  onSave={onSave}
                />
              ))}
            </tbody>
          </table>
          <div className="grow" />
          <FooterTable />
        </section>
      ))}
    </div>
  );
};

export default MeetingMinutesReport;
