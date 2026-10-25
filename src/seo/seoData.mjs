export const SITE_URL = "https://www.neshastyar.com";
export const BRAND_NAME = "نشست یار";
export const BRAND_NAME_EN = "Neshastyar";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/icon-512.png`;

export const HOME_FAQS = [
  {
    question: "نشست یار چیست؟",
    answer:
      "نشست یار یک ابزار هوشمند صورت‌جلسه و آرشیو جلسات است که با هوش مصنوعی، مکالمات شما را خلاصه می‌کند، موارد عملی را استخراج می‌کند و یک پایگاه دانش قابل جستجو می‌سازد.",
  },
  {
    question: "آیا می‌توانم جلسات را با هوش مصنوعی خلاصه کنم؟",
    answer:
      "بله. نشست یار به‌صورت خودکار خلاصه‌های جامع، نکات کلیدی، تصمیم‌ها و بینش‌های مهم جلسه را تولید می‌کند تا دیگر جزئیات مهم از دست نرود.",
  },
  {
    question: "آیا اپلیکیشن اندروید و نسخه وب دارد؟",
    answer:
      "بله. می‌توانید از نسخه وب نشست یار استفاده کنید، اپلیکیشن اندروید را دانلود کنید، یا نسخه وب را به صفحه اصلی گوشی اضافه کنید.",
  },
  {
    question: "آیا نسخه آزمایشی رایگان دارد؟",
    answer:
      "بله. می‌توانید رایگان ثبت‌نام کنید و یک ماه آزمایش رایگان داشته باشید؛ برای شروع نیازی به پرداخت نیست.",
  },
];

function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    alternateName: BRAND_NAME_EN,
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
    image: DEFAULT_OG_IMAGE,
    description:
      "ابزار هوشمند خلاصه‌سازی جلسات، استخراج موارد عملی و آرشیو قابل جستجوی مکالمات با هوش مصنوعی.",
  };
}

function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    alternateName: BRAND_NAME_EN,
    url: SITE_URL,
    inLanguage: "fa-IR",
  };
}

function softwareSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android",
    url: SITE_URL,
    inLanguage: "fa-IR",
    description:
      "نشست یار: خلاصه‌سازی هوشمند جلسات، استخراج موارد عملی و ساخت پایگاه دانش قابل جستجو از مکالمات.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "IRR",
      description: "یک ماه آزمایش رایگان",
    },
  };
}

function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export const SEO_ROUTES = [
  {
    path: "/",
    title: "نشست یار — خلاصه‌سازی هوشمند جلسات و صورت‌جلسه با هوش مصنوعی",
    description:
      "با نشست یار جلسات را با هوش مصنوعی خلاصه کنید، موارد عملی را استخراج کنید و یک پایگاه دانش قابل جستجو از تمام مکالمات بسازید. ثبت‌نام رایگان.",
    indexable: true,
    changefreq: "weekly",
    priority: "1.0",
    schemas: [organizationSchema(), websiteSchema(), softwareSchema(), faqSchema(HOME_FAQS)],
  },
  {
    path: "/login",
    title: "ورود | نشست یار",
    description: "ورود به حساب کاربری نشست یار برای دسترسی به خلاصه جلسات و آرشیو مکالمات.",
    indexable: false,
  },
  {
    path: "/signup",
    title: "ثبت‌نام رایگان | نشست یار",
    description:
      "در نشست یار رایگان ثبت‌نام کنید و یک ماه آزمایش رایگان برای خلاصه‌سازی هوشمند جلسات داشته باشید.",
    indexable: false,
  },
];

export const NOT_FOUND_SEO = {
  path: "/404",
  title: "صفحه پیدا نشد (۴۰۴) — نشست یار",
  description: "صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.",
  indexable: false,
};

export function getIndexableRoutes() {
  return SEO_ROUTES.filter((route) => route.indexable);
}
