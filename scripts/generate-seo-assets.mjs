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
  return `
    <div dir="rtl" class="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#003535]">
      <picture class="pointer-events-none absolute inset-0 select-none">
        <source media="(min-width: 768px)" srcset="/landing-bg-desktop.jpg" />
        <img src="/landing-bg-mobile.jpg" alt="" aria-hidden="true" class="h-full w-full object-cover object-center" />
      </picture>
      <main class="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col items-center px-6">
        <div class="flex items-center gap-2.5 pt-9">
          <span class="text-[28px] font-black text-[#003535]">${escapeHtml(BRAND_NAME)}</span>
        </div>
        <div class="flex-1"></div>
        <h1 class="text-center text-[26px] font-semibold leading-[42px] text-[#003535] sm:text-[34px] sm:leading-[56px]">
          شما در جلسه حاضر باشید،<br />نشست‌یار یادداشت‌ها را می‌نویسد.
        </h1>
        <div class="flex-1"></div>
        <div class="w-full max-w-[380px] pb-5">
          <a href="/login" class="flex h-[58px] w-full items-center justify-center rounded-[30px] bg-[#003535] px-[22px] text-[16px] font-semibold text-white">ادامه با گوگل</a>
          <a href="/login" class="mt-3 flex h-[58px] w-full items-center justify-center rounded-[30px] bg-[#003535] px-[22px] text-[16px] font-semibold text-white">ادامه با ایمیل</a>
          <p class="pt-4 text-center text-[13px] leading-[22px] text-white/95">
            با ادامه، شرایط استفاده و حریم خصوصی نشست‌یار را می‌پذیرید.
          </p>
        </div>
      </main>
    </div>
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
