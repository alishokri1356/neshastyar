import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
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

function sheetRow(
  children: TableCell[],
  options: { header?: boolean; height?: number; split?: boolean } = {},
) {
  return new TableRow({
    ...(options.header ? { tableHeader: true } : {}),
    cantSplit: options.split !== false,
    ...(options.height ? { height: { value: options.height, rule: 'atLeast' as const } } : {}),
    children,
  });
}

function placedCell(
  text: string,
  start: number,
  span: number,
  options: {
    bold?: boolean;
    size?: number;
    center?: boolean;
    shade?: boolean;
    merge?: ConstructorParameters<typeof TableCell>[0]['verticalMerge'];
    children?: Paragraph[];
  } = {},
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

  const table = new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: COLUMN_WIDTHS,
    visuallyRightToLeft: true,
    rows: [
      sheetRow([
        placedCell('', 0, 7, { children: titleChildren }),
        placedCell('', 7, 2, { children: [logo] }),
      ], { header: true, height: 1400 }),
      sheetRow([
        placedCell('عنوان جلسه', 0, 2, { shade: true, bold: true, center: true }),
        placedCell(report.title, 2, 7),
      ], { header: true }),
      sheetRow([
        placedCell('تاریخ و ساعت تشکیل جلسه', 0, 2, { shade: true, bold: true, center: true }),
        placedCell(formatReportDate(report.meetingDate), 2, 3),
        placedCell('محل تشکیل جلسه', 5, 2, { shade: true, bold: true, center: true }),
        placedCell(report.location || '', 7, 2),
      ], { header: true }),
      sheetRow([
        placedCell('اسامی حاضران', 0, 2, { shade: true, bold: true, center: true }),
        placedCell(report.participants.join('، '), 2, 7),
      ], { header: true }),
      sheetRow([
        placedCell('خلاصه تصمیمات', 0, 9, { shade: true, bold: true, center: true }),
      ]),
      sheetRow([
        placedCell('ردیف', 0, 1, { shade: true, bold: true, center: true }),
        placedCell('تصمیم اتخاذ شده', 1, 5, { shade: true, bold: true, center: true }),
        placedCell('مسئول اجرا', 6, 2, { shade: true, bold: true, center: true }),
        placedCell('مهلت زمانی', 8, 1, { shade: true, bold: true, center: true }),
      ]),
      ...report.decisions.map((decision, index) => sheetRow([
        placedCell(String(index + 1), 0, 1, { center: true }),
        placedCell(decision.text, 1, 5),
        placedCell(decision.assignee, 6, 2),
        placedCell(decision.deadline || '', 8, 1),
      ])),
    ],
  });

  const signature = new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: COLUMN_WIDTHS,
    visuallyRightToLeft: true,
    rows: [
      sheetRow([
        placedCell('امضاء حاضران', 0, 2, { shade: true, bold: true, center: true }),
        placedCell('', 2, 7),
      ], { height: 900 }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 567, right: 567, bottom: 1500, left: 567, footer: 200 },
          },
        },
        footers: {
          default: new Footer({ children: [signature] }),
        },
        children: [table],
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
