import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  BRAND_NAME,
  DEFAULT_OG_IMAGE,
  SITE_URL,
  getSeoForPath,
} from "@/seo/seoConfig";

function upsertMetaTag(attributeName: string, attributeValue: string, content: string) {
  if (typeof document === "undefined") return;
  let tag = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attributeName, attributeValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonicalLink(href: string) {
  if (typeof document === "undefined") return;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function syncJsonLdScripts(schemas: Record<string, unknown>[] = []) {
  if (typeof document === "undefined") return;
  document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());

  schemas.forEach((schema) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-jsonld", "true");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  });
}

const SeoHead = () => {
  const location = useLocation();

  useEffect(() => {
    const seo = getSeoForPath(location.pathname);
    const appEnv = (import.meta.env.VITE_APP_ENV || "production").toLowerCase();
    const isProduction = appEnv === "production";
    const shouldIndex = Boolean(seo.indexable) && isProduction;
    const robotsValue = shouldIndex ? "index, follow" : "noindex, nofollow";
    const canonicalPath = seo.path && seo.path !== "/404" ? seo.path : location.pathname;
    const canonicalUrl =
      canonicalPath === "/"
        ? `${SITE_URL}/`
        : `${SITE_URL}${canonicalPath.replace(/\/+$/, "")}`;

    document.title = seo.title;
    document.documentElement.lang = "fa";
    document.documentElement.dir = "rtl";

    upsertMetaTag("name", "description", seo.description);
    upsertMetaTag("name", "robots", robotsValue);
    upsertCanonicalLink(canonicalUrl);

    upsertMetaTag("property", "og:site_name", BRAND_NAME);
    upsertMetaTag("property", "og:locale", "fa_IR");
    upsertMetaTag("property", "og:type", seo.ogType || "website");
    upsertMetaTag("property", "og:title", seo.title);
    upsertMetaTag("property", "og:description", seo.description);
    upsertMetaTag("property", "og:url", canonicalUrl);
    upsertMetaTag("property", "og:image", seo.ogImage || DEFAULT_OG_IMAGE);
    upsertMetaTag("property", "og:image:alt", `${BRAND_NAME} — خلاصه‌سازی هوشمند جلسات`);

    upsertMetaTag("name", "twitter:card", "summary_large_image");
    upsertMetaTag("name", "twitter:title", seo.title);
    upsertMetaTag("name", "twitter:description", seo.description);
    upsertMetaTag("name", "twitter:image", seo.ogImage || DEFAULT_OG_IMAGE);

    const verification = (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || "").trim();
    if (verification) {
      upsertMetaTag("name", "google-site-verification", verification);
    }

    syncJsonLdScripts(seo.schemas || []);
  }, [location.pathname]);

  return null;
};

export default SeoHead;
