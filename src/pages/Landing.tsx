import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Mic, Sparkles, Users, Search } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur safe-top supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-soft">
              <span className="text-lg font-bold text-primary-foreground">M</span>
            </div>
            <span className="text-lg font-semibold text-foreground sm:text-xl">مدیریار</span>
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
            به هزاران متخصصی بپیوندید که از مدیریار برای پربارتر و عملی‌تر کردن 
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