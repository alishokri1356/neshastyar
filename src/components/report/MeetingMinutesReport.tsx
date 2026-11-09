import type { MeetingReportData } from '@/lib/meetingReport';
import { formatReportDate } from '@/lib/meetingReport';

const CODE_ROWS = ['کد سند', 'ویرایش', 'تاریخ ایجاد', 'تاریخ بازنگری'];

interface MeetingMinutesReportProps {
  report: MeetingReportData;
}

const MeetingMinutesReport: React.FC<MeetingMinutesReportProps> = ({ report }) => {
  const dateText = formatReportDate(report.meetingDate);
  const filled = report.decisions.filter((item) => item.text.trim());
  const blankCount = Math.max(2, 4 - filled.length);
  const rows = [
    ...filled,
    ...Array.from({ length: blankCount }, () => ({ text: '', assignee: '' })),
  ];

  return (
    <article className="meeting-minutes" dir="rtl">
      <style>{`
        .meeting-minutes {
          width: 210mm;
          max-width: 100%;
          margin: 0 auto;
          background: #fff;
          color: #111;
          padding: 10mm;
          box-sizing: border-box;
          font-family: Vazirmatn, Tahoma, sans-serif;
        }
        .meeting-minutes table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .meeting-minutes td {
          border: 1px solid #111;
          padding: 6px 8px;
          vertical-align: middle;
          font-size: 13px;
          line-height: 1.7;
          word-break: break-word;
        }
        .meeting-minutes .shade {
          background: #d9d9d9;
          font-weight: 700;
          text-align: center;
        }
        .meeting-minutes .title-cell {
          text-align: center;
          font-weight: 800;
          font-size: 22px;
          line-height: 1.5;
        }
        .meeting-minutes .org-name {
          display: block;
          margin-top: 4px;
          font-size: 13px;
          font-weight: 600;
        }
        .meeting-minutes .logo-cell {
          text-align: center;
        }
        .meeting-minutes .logo-cell img {
          max-width: 100%;
          max-height: 78px;
          object-fit: contain;
        }
        .meeting-minutes .summary-block {
          margin-top: 10px;
          border: 1px solid #111;
        }
        .meeting-minutes .summary-block h2 {
          margin: 0;
          background: #d9d9d9;
          border-bottom: 1px solid #111;
          padding: 6px 8px;
          font-size: 14px;
          font-weight: 700;
        }
        .meeting-minutes .summary-block p {
          margin: 0;
          padding: 8px;
          white-space: pre-wrap;
          line-height: 1.9;
          min-height: 72px;
        }
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          .meeting-minutes {
            width: auto;
            max-width: none;
            padding: 0;
          }
        }
      `}</style>

      <table>
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
        <tbody>
          <tr>
            <td className="shade" colSpan={2}>{CODE_ROWS[0]}</td>
            <td />
            <td className="title-cell" rowSpan={4} colSpan={4}>
              صورتجلسه سازمانی
              {report.orgName ? <span className="org-name">{report.orgName}</span> : null}
            </td>
            <td className="logo-cell" rowSpan={4} colSpan={2}>
              {report.logoUrl ? <img src={report.logoUrl} alt={report.orgName || 'نشان سازمان'} /> : null}
            </td>
          </tr>
          {CODE_ROWS.slice(1).map((label) => (
            <tr key={label}>
              <td className="shade" colSpan={2}>{label}</td>
              <td />
            </tr>
          ))}
          <tr>
            <td className="shade" colSpan={2}>عنوان جلسه</td>
            <td colSpan={7}>{report.title}</td>
          </tr>
          <tr>
            <td className="shade" colSpan={2}>تاریخ و ساعت تشکیل جلسه</td>
            <td colSpan={3}>{dateText}</td>
            <td className="shade" colSpan={2}>مدت زمان و ساعت اتمام جلسه</td>
            <td colSpan={2} />
          </tr>
          <tr>
            <td className="shade" colSpan={2}>محل تشکیل جلسه</td>
            <td colSpan={3} />
            <td className="shade" colSpan={2}>دبیر جلسه</td>
            <td colSpan={2} />
          </tr>
          <tr>
            <td className="shade" colSpan={2}>شماره جلسه</td>
            <td colSpan={7} />
          </tr>
          <tr>
            <td className="shade" colSpan={2}>اسامی حاضران</td>
            <td colSpan={7}>{report.participants.join('، ')}</td>
          </tr>
          <tr>
            <td className="shade" colSpan={9}>خلاصه تصمیمات</td>
          </tr>
          <tr>
            <td className="shade">ردیف</td>
            <td className="shade" colSpan={4}>تصمیم اتخاذ شده</td>
            <td className="shade">مسئول اجرا</td>
            <td className="shade" colSpan={2}>مسئول پیگیری</td>
            <td className="shade">مهلت زمانی</td>
          </tr>
          {rows.map((decision, index) => (
            <tr key={`${index}-${decision.text.slice(0, 12)}`}>
              <td style={{ textAlign: 'center' }}>{filled[index] ? index + 1 : ''}</td>
              <td colSpan={4}>{decision.text}</td>
              <td>{decision.assignee}</td>
              <td colSpan={2} />
              <td />
            </tr>
          ))}
          <tr>
            <td className="shade" colSpan={2}>امضاء حاضران</td>
            <td colSpan={4} style={{ height: 72 }} />
            <td className="shade" colSpan={2}>امضاء رئیس جلسه</td>
            <td />
          </tr>
        </tbody>
      </table>

      {report.summaryText ? (
        <section className="summary-block">
          <h2>خلاصه جلسه</h2>
          <p>{report.summaryText}</p>
        </section>
      ) : null}
    </article>
  );
};

export default MeetingMinutesReport;
