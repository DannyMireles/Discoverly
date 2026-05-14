export function isDemoToolsEnabled() {
  return process.env.ENABLE_DEMO_TOOLS === "true" || process.env.VERCEL_ENV !== "production";
}
