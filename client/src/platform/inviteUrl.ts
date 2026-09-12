export function roomInviteUrl(code: string, origin = window.location.origin, baseUrl = import.meta.env.BASE_URL) {
  const base = new URL(baseUrl, `${origin}/`).toString();
  return `${base}#/room/${encodeURIComponent(code)}`;
}
