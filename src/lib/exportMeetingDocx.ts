import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
} from 'docx';
import type { MeetingReportData } from '@/lib/meetingReport';
import { formatReportDate } from '@/lib/meetingReport';

const RAW_WIDTHS = [814, 603, 1417, 2679, 1111, 1421, 142, 1344, 1496];
const RAW_TOTAL = RAW_WIDTHS.reduce((sum, width) => sum + width, 0);
const CONTENT_WIDTH = 11906 - 567 - 567;
const COLUMN_WIDTHS = RAW_WIDTHS.map((width) => Math.round((width / RAW_TOTAL) * CONTENT_WIDTH));

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const margins = { top: 60, bottom: 60, left: 80, right: 80 };

function paragraph(text: string, options: { bold?: boolean; size?: number; center?: boolean } = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: options.center ? AlignmentType.CENTER : AlignmentType.RIGHT,
    children: [
      new TextRun({
        text: text || '',
        bold: options.bold,
        font: 'B Nazanin',
        size: options.size || 22,
        rightToLeft: true,
      }),
    ],
  });
}

function spanWidth(start: number, span: number) {
  return COLUMN_WIDTHS.slice(start, start + span).reduce((sum, value) => sum + value, 0);
}

function placedCell(
  text: string,
  start: number,
  span: number,
  options: Parameters<typeof cell>[2] = {},
) {
  return new TableCell({
    width: { size: spanWidth(start, span), type: WidthType.DXA },
    columnSpan: span,
    verticalAlign: VerticalAlign.CENTER,
    verticalMerge: options.merge,
    shading: options.shade ? { fill: 'D9D9D9' } : undefined,
    borders,
    margins,
    children: options.children || [paragraph(text, options)],
  });
}

async function logoParagraph(logoUrl: string | null): Promise<Paragraph> {
  if (!logoUrl) return paragraph('');
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return paragraph('');
    const typeHeader = response.headers.get('content-type') || '';
    const bytes = new Uint8Array(await response.arrayBuffer());
    const kind = typeHeader.includes('png') || bytes[0] === 0x89
      ? 'png'
      : typeHeader.includes('gif')
        ? 'gif'
        : typeHeader.includes('bmp')
          ? 'bmp'
          : (typeHeader.includes('jpeg') || typeHeader.includes('jpg') || bytes[0] === 0xff)
            ? 'jpg'
            : null;
    if (!kind || typeHeader.includes('svg')) return paragraph('');
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          type: kind,
          data: bytes,
          transformation: { width: 92, height: 72 },
          altText: { name: 'logo', title: 'نشان سازمان', description: 'نشان سازمان' },
        }),
      ],
    });
  } catch {
    return paragraph('');
  }
}

export async function downloadMeetingDocx(report: MeetingReportData) {
  const logo = await logoParagraph(report.logoUrl);
  const titleChildren = [
    paragraph('صورتجلسه سازمانی', { bold: true, size: 36, center: true }),
  ];
  if (report.orgName) {
    titleChildren.push(paragraph(report.orgName, { bold: true, size: 22, center: true }));
  }

  const codeLabels = ['کد سند', 'ویرایش', 'تاریخ ایجاد', 'تاریخ بازنگری'];
  const headerRows = codeLabels.map((label, index) => new TableRow({
    children: [
      placedCell(label, 0, 2, { shade: true, bold: true, center: true }),
      placedCell('', 2, 1),
      placedCell('', 3, 4, {
        merge: index === 0 ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE,
        children: index === 0 ? titleChildren : [paragraph('')],
      }),
      placedCell('', 7, 2, {
        merge: index === 0 ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE,
        children: index === 0 ? [logo] : [paragraph('')],
      }),
    ],
  }));

  const filled = report.decisions.filter((item) => item.text.trim());
  const blankCount = Math.max(2, 4 - filled.length);
  const decisionRows = [
    ...filled,
    ...Array.from({ length: blankCount }, () => ({ text: '', assignee: '' })),
  ];

  const table = new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: COLUMN_WIDTHS,
    visuallyRightToLeft: true,
    rows: [
      ...headerRows,
      new TableRow({
        children: [
          placedCell('عنوان جلسه', 0, 2, { shade: true, bold: true, center: true }),
          placedCell(report.title, 2, 7),
        ],
      }),
      new TableRow({
        children: [
          placedCell('تاریخ و ساعت تشکیل جلسه', 0, 2, { shade: true, bold: true, center: true }),
          placedCell(formatReportDate(report.meetingDate), 2, 3),
          placedCell('مدت زمان و ساعت اتمام جلسه', 5, 2, { shade: true, bold: true, center: true }),
          placedCell('', 7, 2),
        ],
      }),
      new TableRow({
        children: [
          placedCell('محل تشکیل جلسه', 0, 2, { shade: true, bold: true, center: true }),
          placedCell('', 2, 3),
          placedCell('دبیر جلسه', 5, 2, { shade: true, bold: true, center: true }),
          placedCell('', 7, 2),
        ],
      }),
      new TableRow({
        children: [
          placedCell('شماره جلسه', 0, 2, { shade: true, bold: true, center: true }),
          placedCell('', 2, 7),
        ],
      }),
      new TableRow({
        children: [
          placedCell('اسامی حاضران', 0, 2, { shade: true, bold: true, center: true }),
          placedCell(report.participants.join('، '), 2, 7),
        ],
      }),
      new TableRow({
        children: [placedCell('خلاصه تصمیمات', 0, 9, { shade: true, bold: true, center: true })],
      }),
      new TableRow({
        children: [
          placedCell('ردیف', 0, 1, { shade: true, bold: true, center: true }),
          placedCell('تصمیم اتخاذ شده', 1, 4, { shade: true, bold: true, center: true }),
          placedCell('مسئول اجرا', 5, 1, { shade: true, bold: true, center: true }),
          placedCell('مسئول پیگیری', 6, 2, { shade: true, bold: true, center: true }),
          placedCell('مهلت زمانی', 8, 1, { shade: true, bold: true, center: true }),
        ],
      }),
      ...decisionRows.map((decision, index) => new TableRow({
        children: [
          placedCell(filled[index] ? String(index + 1) : '', 0, 1, { center: true }),
          placedCell(decision.text, 1, 4),
          placedCell(decision.assignee, 5, 1),
          placedCell('', 6, 2),
          placedCell('', 8, 1),
        ],
      })),
      new TableRow({
        height: { value: 900, rule: 'atLeast' },
        children: [
          placedCell('امضاء حاضران', 0, 2, { shade: true, bold: true, center: true }),
          placedCell('', 2, 4),
          placedCell('امضاء رئیس جلسه', 6, 2, { shade: true, bold: true, center: true }),
          placedCell('', 8, 1),
        ],
      }),
    ],
  });

  const summaryBlocks = report.summaryText
    ? [
        new Paragraph({ spacing: { before: 200 } }),
        paragraph('خلاصه جلسه', { bold: true, size: 24 }),
        ...report.summaryText.split('\n').map((line) => paragraph(line)),
      ]
    : [];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 567, right: 567, bottom: 567, left: 567 },
          },
        },
        children: [table, ...summaryBlocks],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = (report.title || 'صورتجلسه').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'صورتجلسه';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
