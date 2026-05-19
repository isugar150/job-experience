export function withBase(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

export function cssUrlWithBase(path: string): string {
  return `url('${withBase(path)}')`;
}
