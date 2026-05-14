export function getAppBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

  return base.replace(/\/$/, "");
}

export function buildAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBaseUrl()}${normalizedPath}`;
}

export function getLodgifyPromotionsUrl() {
  return (
    process.env.LODGIFY_PROMOTIONS_URL ??
    process.env.NEXT_PUBLIC_LODGIFY_PROMOTIONS_URL ??
    "https://app.lodgify.com"
  );
}
