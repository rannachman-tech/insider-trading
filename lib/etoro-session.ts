"use client";

const KEY = "iac-etoro:v1";
export const ETORO_EVENT = "iac-etoro-changed";

export interface EtoroSession {
  apiKey: string;
  userKey: string;
  env: "real" | "demo";
  username: string;
  cid: number;
  connectedAt: string;
}

export function loadEtoroSession(): EtoroSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EtoroSession;
  } catch {
    return null;
  }
}

export function saveEtoroSession(s: EtoroSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event(ETORO_EVENT));
  } catch {}
}

export function clearEtoroSession(): void {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(ETORO_EVENT));
  } catch {}
}
