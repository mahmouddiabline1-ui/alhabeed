import type { Session } from "../../types";

export const ALHABEED_SESSION_KEY = "alhabeed:session";

export function readAlHabeedSession(): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(ALHABEED_SESSION_KEY) ?? "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const candidate = value as Record<string, unknown>;
    if (["code", "playerId", "name", "token"].some((key) => typeof candidate[key] !== "string")) return null;
    return candidate as unknown as Session;
  } catch {
    return null;
  }
}

export function saveAlHabeedSession(session: Session): void {
  localStorage.setItem(ALHABEED_SESSION_KEY, JSON.stringify(session));
}

export function clearAlHabeedSession(): void {
  localStorage.removeItem(ALHABEED_SESSION_KEY);
}
