import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Mic, Sparkles, Users, Search } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import androidVersionFile from "../../android-app/versioning.txt?raw";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://neshastyar.com/api").replace(/\/$/, "");
const ANDROID_VERSION = androidVersionFile.trim();

type LatestApk = {
  filename: string;
  downloadUrl: string;
};

const Landing = () => {
  const navigate = useNavigate();
  const [latestApk, setLatestApk] = useState<LatestApk | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE_URL}/android/latest`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload?.data) {
          const data = payload.data;
          setLatestApk({
            ...data,
            downloadUrl:
              data.downloadUrl ||
              `${API_BASE_URL}/android/latest/download/${data.filename}`,
          });
        }
      })
      .catch(() => {
        // Keep the download button even if version lookup fails.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const apkDownloadHref = latestApk?.downloadUrl || `${API_BASE_URL}/android/latest/download`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur safe-top supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-soft">
              <span className="text-lg font-bold text-primary-foreground">ن</span>
            </div>
            <span className="text-lg font-semibold text-foreground sm:text-xl">نشست یار</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/login')}
              className="text-muted-foreground hover:text-foreground"
            >
              ورود
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate('/signup')}
              className="bg-primary hover:bg-primary/90"
            >
              شروع کنید
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto py-12 text-center sm:py-16">
        <div className="mx-auto max-w-4xl">
          {/* Microphone Icon */}
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <Mic className="h-10 w-10 text-primary-foreground" />
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-3xl font-bold leading-tight sm:text-4xl md:text-6xl">
           یک پایگاه دانش قابل جستجو 
            از تمام مکالمات خود ایجاد کنید
          </h1>

          {/* Description */}
          <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:text-xl">
            جلسات خود را باهوش مصنوعی خلاصه سازی کنید، ساماندهی کنید و هرگز مباحث مهم را از دست ندهید. 
          </p>

          {/* CTA Buttons */}
          <div className="mb-16 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/signup')}
              className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg"
            >
              رایگان ثبت نام کنید ←
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/login')}
              className="px-8 py-4 text-lg"
            >
              ورود
            </Button>
          </div>

          <div className="mx-auto mb-8 w-full max-w-3xl rounded-[28px] bg-[#121418] p-4 text-white shadow-medium sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <a
                href={apkDownloadHref}
                download={latestApk?.filename}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-400/80 bg-emerald-950/50 px-4 py-7 shadow-[0_0_28px_rgba(52,211,153,0.22)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                aria-label="دانلود آخرین نسخه اپلیکیشن اندروید"
              >
                <AndroidMark />
                <span className="text-sm font-semibold sm:text-base">اپلیکیشن اندروید</span>
              </a>
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-800/70 px-4 py-7 text-zinc-300"
                aria-disabled="true"
              >
                <AppleMark />
                <span className="text-sm font-semibold sm:text-base">اپلیکیشن iOS</span>
                <span className="text-xs text-zinc-500">به‌زودی</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 rounded-2xl bg-black/35 p-4 sm:gap-6 sm:p-5">
              <div className="shrink-0 rounded-2xl bg-white p-2">
                <QRCodeSVG
                  value={apkDownloadHref}
                  size={112}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#111111"
                  aria-label="کد QR دانلود اپلیکیشن اندروید"
                />
              </div>
              <p className="text-sm leading-7 text-zinc-100 sm:text-base">
                برای دریافت آدرس اپلیکیشن اندروید، دوربین گوشی خود را روی کد QR (شکل مربع) بگیرید تا اسکن شود.
              </p>
            </div>
            <p className="mt-3 text-center text-xs text-zinc-400">
              {`دانلود مستقیم برای اندروید • نسخه ${ANDROID_VERSION}`}
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto py-12 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
          {/* AI-Powered Summaries */}
          <Card className="text-center p-6 border border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">خلاصه‌سازی هوشمند</h3>
              <p className="text-muted-foreground">
                به طور خودکار خلاصه‌های جامع جلسات با نکات کلیدی، تصمیمات و بینش‌ها با استفاده از فناوری پیشرفته هوش مصنوعی تولید کنید.
              </p>
            </CardContent>
          </Card>

          {/* Action Item Extraction */}
          <Card className="text-center p-6 border border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">استخراج موارد عملی</h3>
              <p className="text-muted-foreground">
                هرگز پیگیری را از دست ندهید. هوش مصنوعی موارد عملی، مهلت‌ها و تکالیف را از مکالمات شما شناسایی و استخراج می‌کند.
              </p>
            </CardContent>
          </Card>

          {/* Searchable Archive */}
          <Card className="text-center p-6 border border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">آرشیو قابل جستجو</h3>
              <p className="text-muted-foreground">
                یک پایگاه دانش قابل جستجو از تمام جلسات خود بسازید. هر بحث، تصمیم یا جزئیات را فوراً پیدا کنید.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="bg-muted/30 py-12 sm:py-16">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
            آماده انقلاب در جلسات خود هستید؟
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            به هزاران متخصصی بپیوندید که از نشست یار برای پربارتر و عملی‌تر کردن 
            جلسات خود استفاده می‌کنند.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/signup')}
            className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg"
          >
            رایگان شروع کنید ←
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            نیازی به پرداخت پول نیست • یک ماه آزمایش رایگان
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            🔒 امنیت سازمانی و تطبیق با GDPR
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

function AndroidMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12 text-emerald-400" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48C4.3 11.05 2.8 13.7 2.5 16.7h19c-.3-3-1.8-5.65-3.9-7.22zM7 14.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12 text-zinc-100" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.37 12.72c-.03-2.45 2-3.63 2.09-3.69-1.14-1.67-2.92-1.9-3.55-1.93-1.51-.15-2.95.89-3.72.89-.77 0-1.96-.87-3.22-.84-1.66.02-3.19.96-4.04 2.45-1.72 2.99-.44 7.42 1.24 9.85.82 1.19 1.8 2.52 3.08 2.47 1.24-.05 1.7-.8 3.2-.8 1.49 0 1.91.8 3.22.77 1.33-.02 2.17-1.21 2.98-2.41.94-1.37 1.33-2.7 1.35-2.77-.03-.01-2.59-1-2.63-3.99zM14.34 6.3c.68-.82 1.14-1.97 1.01-3.11-1 .04-2.2.66-2.91 1.49-.64.74-1.2 1.92-1.05 3.05 1.1.09 2.23-.56 2.95-1.43z"
      />
    </svg>
  );
}