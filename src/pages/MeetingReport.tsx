import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Download, Printer, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import MeetingMinutesReport from '@/components/report/MeetingMinutesReport';
import { AiEditBottomSheet } from '@/components/neshastyar/MeetingDetailChrome';
import { downloadMeetingDocx } from '@/lib/exportMeetingDocx';
import {
  aiEditPublicReport,
  fetchPublicReport,
  parseReportDateInput,
  updatePublicReport,
  uploadReportLogo,
  type MeetingReportData,
  type ReportEdit,
} from '@/lib/meetingReport';
import { useAuthStore } from '@/store/useAuthStore';

const MeetingReport: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const [report, setReport] = useState<MeetingReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showAiEdit, setShowAiEdit] = useState(false);

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

  useEffect(() => {
    if (!report?.title) return;
    document.title = `${report.title} | صورتجلسه`;
  }, [report]);

  useEffect(() => {
    if (searchParams.get('aiEdit') !== '1' || !isAuthenticated) return;
    setShowAiEdit(true);
    const next = new URLSearchParams(searchParams);
    next.delete('aiEdit');
    setSearchParams(next, { replace: true });
  }, [isAuthenticated, searchParams, setSearchParams]);

  const saveCell = async (edit: ReportEdit) => {
    if (!token) return;
    let payload = edit;
    if (edit.field === 'date') {
      const parsed = parseReportDateInput(edit.value);
      if (parsed == null) {
        throw new Error('تاریخ را مثل 1405/08/11 - 16:54 وارد کنید');
      }
      payload = { field: 'date', value: parsed };
    }
    const updated = await updatePublicReport(token, payload);
    setReport(updated);
  };

  const uploadLogo = async (file: File) => {
    if (!token) return;
    const updated = await uploadReportLogo(token, file);
    setReport(updated);
  };

  const openSmartEdit = () => {
    if (!isAuthenticated) {
      const back = `/report/${token}?aiEdit=1`;
      navigate(`/?next=${encodeURIComponent(back)}`);
      return;
    }
    setShowAiEdit(true);
  };

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white" dir="rtl">
      <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-4 py-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            onClick={openSmartEdit}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#E4C48A] bg-gradient-to-l from-[#D7EFED] to-[#FDE8C4] px-3 text-sm font-semibold text-[#0D4D4D] transition hover:brightness-95"
          >
            <Sparkles className="h-4 w-4 text-[#C88A2E]" />
            ویرایش هوشمند
          </button>
        </div>
        <Link to="/" dir="ltr" className="flex shrink-0 items-center gap-2 text-[#0D4D4D]">
          <img
            src="/icons/icon-192.png"
            alt=""
            className="h-9 w-9 rounded-lg"
          />
          <span className="text-[18px] font-bold">نشست یار</span>
        </Link>
      </div>

      {loading ? (
        <p className="py-16 text-center text-muted-foreground">در حال بارگذاری صورتجلسه...</p>
      ) : error || !report ? (
        <p className="py-16 text-center text-destructive">{error || 'صورتجلسه پیدا نشد'}</p>
      ) : (
        <div className="px-4 pb-10 print:p-0">
          <MeetingMinutesReport
            report={report}
            onSave={report.canEdit === false ? undefined : saveCell}
            onUploadLogo={report.canEdit === false ? undefined : uploadLogo}
          />
        </div>
      )}

      <AiEditBottomSheet
        open={showAiEdit}
        meetingId=""
        onOpenChange={setShowAiEdit}
        onSubmit={async (prompt) => {
          const result = await aiEditPublicReport(token, prompt);
          const updated = await fetchPublicReport(token);
          setReport(updated);
          return result;
        }}
        onEdited={(res) => {
          toast({
            title: res.changes_summary?.trim() || 'ویرایش هوشمند انجام و ذخیره شد',
          });
        }}
      />
    </div>
  );
};

export default MeetingReport;
