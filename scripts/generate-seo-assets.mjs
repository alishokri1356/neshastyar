import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BRAND_NAME,
  DEFAULT_OG_IMAGE,
  HOME_FAQS,
  NOT_FOUND_SEO,
  SITE_URL,
  getIndexableRoutes,
} from "../src/seo/seoData.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");

function parseDotEnv(envFilePath) {
  if (!fs.existsSync(envFilePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envFilePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHomeBody() {
  const faqsHtml = HOME_FAQS.map(
    (faq) => `
      <div class="rounded-xl border border-border p-6 bg-card text-right">
        <h3 class="text-lg font-semibold mb-2">${escapeHtml(faq.question)}</h3>
        <p class="text-muted-foreground leading-8">${escapeHtml(faq.answer)}</p>
      </div>`,
  ).join("\n");

  return `
    <header class="border-b px-4 py-3">
      <div class="mx-auto flex max-w-5xl items-center justify-between">
        <a href="/" class="text-lg font-semibold">${escapeHtml(BRAND_NAME)}</a>
        <nav aria-label="ناوبری اصلی" class="flex gap-3 text-sm">
          <a href="/login">ورود</a>
          <a href="/signup">ثبت‌نام</a>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-12 text-right">
      <section class="text-center mb-12">
        <h1 class="mb-6 text-3xl font-bold leading-tight sm:text-5xl">
          یک پایگاه دانش قابل جستجو از تمام مکالمات خود ایجاد کنید
        </h1>
        <p class="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground leading-8">
          جلسات خود را با هوش مصنوعی خلاصه‌سازی کنید، ساماندهی کنید و هرگز مباحث مهم را از دست ندهید.
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <a href="/signup" class="rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium">رایگان ثبت نام کنید</a>
          <a href="/login" class="rounded-md border px-6 py-3 font-medium">ورود</a>
        </div>
      </section>
      <section class="grid gap-6 sm:grid-cols-3 mb-12 text-center">
        <article class="rounded-xl border p-6">
          <h2 class="text-xl font-semibold mb-3">خلاصه‌سازی هوشمند</h2>
          <p class="text-muted-foreground leading-8">خلاصه‌های جامع جلسات با نکات کلیدی و تصمیم‌ها با هوش مصنوعی.</p>
        </article>
        <article class="rounded-xl border p-6">
          <h2 class="text-xl font-semibold mb-3">استخراج موارد عملی</h2>
          <p class="text-muted-foreground leading-8">شناسایی موارد پیگیری، مهلت‌ها و تکالیف از مکالمات شما.</p>
        </article>
        <article class="rounded-xl border p-6">
          <h2 class="text-xl font-semibold mb-3">آرشیو قابل جستجو</h2>
          <p class="text-muted-foreground leading-8">پایگاه دانش قابل جستجو از تمام جلسات و جزئیات مهم.</p>
        </article>
      </section>
      <section aria-labelledby="faq-heading" class="mb-12">
        <h2 id="faq-heading" class="text-2xl font-bold mb-6 text-center">سوالات متداول</h2>
        <div class="space-y-4">${faqsHtml}</div>
      </section>
    </main>
    <footer class="border-t py-8 text-center text-sm text-muted-foreground">
      <p>© ${new Date().getFullYear()} ${escapeHtml(BRAND_NAME)} — امنیت سازمانی و تطبیق با GDPR</p>
    </footer>
  `;
}

function renderNotFoundBody() {
  return `
    <main class="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p class="text-6xl font-extrabold text-primary mb-2">۴۰۴</p>
      <h1 class="text-2xl font-bold mb-4">صفحه پیدا نشد</h1>
      <p class="text-muted-foreground mb-6">صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.</p>
      <a href="/" class="rounded-md bg-primary px-6 py-2.5 text-primary-foreground font-medium">بازگشت به خانه</a>
    </main>
  `;
}

function renderPrerenderedBody(routePath) {
  if (routePath === "/") return renderHomeBody();
  if (routePath === "/404") return renderNotFoundBody();
  return "";
}

function buildHeadBlock(seo, { isProduction, googleSiteVerification }) {
  const shouldIndex = Boolean(seo.indexable) && isProduction;
  const robotsContent = shouldIndex ? "index, follow" : "noindex, nofollow";
  const canonicalUrl =
    seo.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${seo.path.replace(/\/+$/, "")}`;

  const lines = [
    `<!-- SEO_HEAD_START -->`,
    `    <title>${escapeHtml(seo.title)}</title>`,
    `    <meta name="description" content="${escapeHtml(seo.description)}" />`,
    `    <meta name="robots" content="${robotsContent}" />`,
    `    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `    <meta property="og:site_name" content="${escapeHtml(BRAND_NAME)}" />`,
    `    <meta property="og:locale" content="fa_IR" />`,
    `    <meta property="og:type" content="${escapeHtml(seo.ogType || "website")}" />`,
    `    <meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `    <meta property="og:image" content="${escapeHtml(seo.ogImage || DEFAULT_OG_IMAGE)}" />`,
    `    <meta property="og:image:alt" content="${escapeHtml(BRAND_NAME)} — خلاصه‌سازی هوشمند جلسات" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `    <meta name="twitter:image" content="${escapeHtml(seo.ogImage || DEFAULT_OG_IMAGE)}" />`,
  ];

  if (googleSiteVerification) {
    lines.push(
      `    <meta name="google-site-verification" content="${escapeHtml(googleSiteVerification)}" />`,
    );
  }

  for (const schema of seo.schemas || []) {
    lines.push(
      `    <script type="application/ld+json" data-seo-jsonld="true">${JSON.stringify(schema)}</script>`,
    );
  }

  lines.push(`    <!-- SEO_HEAD_END -->`);
  return lines.join("\n");
}

function generateRouteHtml(baseTemplate, seo, envOptions) {
  const headBlock = buildHeadBlock(seo, envOptions);
  const bodyHtml = renderPrerenderedBody(seo.path);
  let html = baseTemplate.replace(
    /<!-- SEO_HEAD_START -->[\s\S]*?<!-- SEO_HEAD_END -->/,
    headBlock,
  );
  html = html.replace("<!-- SEO_PRERENDER_BODY -->", bodyHtml);
  return html;
}

function generateSitemapXml(routes) {
  const lastmod = new Date().toISOString().split("T")[0];
  const urlEntries = routes
    .map((route) => {
      const loc =
        route.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${route.path.replace(/\/+$/, "")}`;
      return [
        "  <url>",
        `    <loc>${escapeHtml(loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${route.changefreq || "weekly"}</changefreq>`,
        `    <priority>${route.priority || "0.7"}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntries,
    "</urlset>",
    "",
  ].join("\n");
}

function generateRobotsTxt({ isProduction }) {
  if (!isProduction) {
    return ["User-agent: *", "Disallow: /", ""].join("\n");
  }
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /home",
    "Disallow: /tag",
    "Disallow: /meeting",
    "Disallow: /record",
    "Disallow: /tags",
    "Disallow: /participants",
    "Disallow: /participant",
    "Disallow: /account",
    "Disallow: /admin",
    "Disallow: /verify-email",
    "Disallow: /reset-password",
    "Disallow: /forgot-password",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`[SEO] dist not found at ${DIST_DIR}. Run vite build first.`);
    process.exit(1);
  }

  const mergedEnv = {
    ...parseDotEnv(path.join(ROOT, ".env")),
    ...parseDotEnv(path.join(ROOT, ".env.production")),
    ...process.env,
  };
  const appEnv = (mergedEnv.VITE_APP_ENV || "production").toLowerCase();
  const isProduction = appEnv === "production";
  const googleSiteVerification = (mergedEnv.VITE_GOOGLE_SITE_VERIFICATION || "").trim();
  const envOptions = { isProduction, googleSiteVerification };

  const indexHtmlPath = path.join(DIST_DIR, "index.html");
  const baseTemplate = fs.readFileSync(indexHtmlPath, "utf8");
  const indexableRoutes = getIndexableRoutes();

  for (const route of indexableRoutes) {
    const routeHtml = generateRouteHtml(baseTemplate, route, envOptions);
    if (route.path === "/") {
      fs.writeFileSync(indexHtmlPath, routeHtml, "utf8");
    } else {
      const targetDir = path.join(DIST_DIR, route.path.replace(/^\/+/, ""));
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, "index.html"), routeHtml, "utf8");
    }
  }

  const notFoundHtml = generateRouteHtml(baseTemplate, NOT_FOUND_SEO, envOptions);
  fs.writeFileSync(path.join(DIST_DIR, "404.html"), notFoundHtml, "utf8");
  fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), generateSitemapXml(indexableRoutes), "utf8");
  fs.writeFileSync(path.join(DIST_DIR, "robots.txt"), generateRobotsTxt({ isProduction }), "utf8");

  console.log(
    `[SEO] Pre-rendered ${indexableRoutes.length} public routes + 404.html, sitemap.xml, robots.txt (env=${appEnv})`,
  );
}

main();
