import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Mic, Sparkles, Users, Search } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
            <span className="font-semibold text-xl text-foreground">مدیریار</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="text-muted-foreground hover:text-foreground"
            >
              ورود
            </Button>
            <Button 
              onClick={() => navigate('/signup')}
              className="bg-primary hover:bg-primary/90"
            >
              شروع کنید
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Microphone Icon */}
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-8">
            <Mic className="w-10 h-10 text-primary-foreground" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            جلسات خود را تبدیل کنید
            <br />
            <span className="text-primary">با قدرت هوش مصنوعی</span>
          </h1>

          {/* Description */}
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            جلسات خود را ضبط، خلاصه‌سازی و استخراج موارد عملی کنید. یک پایگاه دانش قابل جستجو 
            از تمام مکالمات خود ایجاد کنید.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg" 
              onClick={() => navigate('/signup')}
              className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg"
            >
              شروع آزمایش رایگان ←
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
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-foreground">
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
            نیازی به کارت اعتباری نیست • ۱۴ روز آزمایش رایگان
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