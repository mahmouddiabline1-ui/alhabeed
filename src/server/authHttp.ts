export const refreshCookieName="alhabeed_refresh";

export function refreshCookie(token:string,maxAge=30*24*60*60):string {
  // The UI is hosted on pages.dev while the API is hosted on railway.app, so
  // credentialed fetch requests require an explicitly cross-site cookie.
  return `${refreshCookieName}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/api/auth; HttpOnly; Secure; SameSite=None`;
}

export function readCookie(header:string|undefined,name:string):string|undefined {
  return header?.split(";").map(part=>part.trim().split("=")).find(([key])=>key===name)?.slice(1).join("=");
}
