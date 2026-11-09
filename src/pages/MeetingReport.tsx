import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MeetingMinutesReport from '@/components/report/MeetingMinutesReport';
import { downloadMeetingDocx } from '@/lib/exportMeetingDocx';
import { fetchPublicReport, type MeetingReportData } from '@/lib/meetingReport';

const MeetingReport: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<MeetingReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('لینک صورتجلسه نامعتبر است');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPublicReport(token)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'صورتجلسه پیدا نشد');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white" dir="rtl">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2 px-4 py-4 print:hidden">
        <Button onClick={() => window.print()} disabled={!report}>
          <Printer className="h-4 w-4" />
          چاپ / ذخیره PDF
        </Button>
        <Button
          variant="outline"
          disabled={!report || downloading}
          onClick={async () => {
            if (!report) return;
            setDownloading(true);
            try {
              await downloadMeetingDocx(report);
            } finally {
              setDownloading(false);
            }
          }}
        >
          <Download className="h-4 w-4" />
          {downloading ? 'در حال ساخت...' : 'دانلود Word'}
        </Button>
        <Button variant="outline" onClick={copyLink}>
          <Copy className="h-4 w-4" />
          {copied ? 'کپی شد' : 'کپی لینک'}
        </Button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-muted-foreground">در حال بارگذاری صورتجلسه...</p>
      ) : error || !report ? (
        <p className="py-16 text-center text-destructive">{error || 'صورتجلسه پیدا نشد'}</p>
      ) : (
        <div className="px-4 pb-10 print:p-0">
          <MeetingMinutesReport report={report} />
        </div>
      )}
    </div>
  );
};

export default MeetingReport;
