import {
  BRAND_NAME,
  BRAND_NAME_EN,
  DEFAULT_OG_IMAGE,
  HOME_FAQS,
  NOT_FOUND_SEO,
  SEO_ROUTES,
  SITE_URL,
  getIndexableRoutes,
} from "./seoData.mjs";

export {
  BRAND_NAME,
  BRAND_NAME_EN,
  DEFAULT_OG_IMAGE,
  HOME_FAQS,
  NOT_FOUND_SEO,
  SEO_ROUTES,
  SITE_URL,
  getIndexableRoutes,
};

export type SeoRoute = {
  path: string;
  title: string;
  description: string;
  indexable: boolean;
  changefreq?: string;
  priority?: string;
  ogType?: string;
  ogImage?: string;
  schemas?: Record<string, unknown>[];
};

const PROTECTED_PREFIXES = [
  "/home",
  "/tag",
  "/meeting",
  "/record",
  "/tag-selection",
  "/meetings",
  "/tags",
  "/participants",
  "/participant",
  "/account",
  "/admin",
  "/forgot-password",
  "/verify-email",
  "/reset-password",
];

export function getSeoForPath(pathname: string): SeoRoute {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname || "/";

  const exact = (SEO_ROUTES as SeoRoute[]).find((route) => route.path === normalized);
  if (exact) return exact;

  if (
    PROTECTED_PREFIXES.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
    )
  ) {
    return {
      path: normalized,
      title: `${BRAND_NAME} | پنل کاربری`,
      description: "پنل کاربری نشست یار",
      indexable: false,
    };
  }

  return {
    ...(NOT_FOUND_SEO as SeoRoute),
    path: normalized,
  };
}
