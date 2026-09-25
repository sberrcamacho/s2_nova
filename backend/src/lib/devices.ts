// Turns a refresh token's stored User-Agent into the label Ajustes ›
// Sesiones activas shows ("Chrome · Windows", "S2 Nova app · Pixel 8").
// The Android client sends "S2Nova-Android/<version> (<model>)"; any other
// OkHttp request predates that header and is still the Android app.

export type DeviceKind = "desktop" | "phone" | "tablet";

export interface DeviceInfo {
  // null when the agent is missing or unrecognisable — the client shows
  // its own "unknown device" copy.
  name: string | null;
  kind: DeviceKind;
}

const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

function osOf(ua: string): { os: string | null; kind: DeviceKind } {
  if (/iPad/.test(ua)) return { os: "iPad", kind: "tablet" };
  if (/iPhone/.test(ua)) return { os: "iPhone", kind: "phone" };
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? { os: "Android", kind: "phone" } : { os: "Android", kind: "tablet" };
  if (/Windows NT/.test(ua)) return { os: "Windows", kind: "desktop" };
  if (/CrOS/.test(ua)) return { os: "ChromeOS", kind: "desktop" };
  if (/Mac OS X|Macintosh/.test(ua)) return { os: "macOS", kind: "desktop" };
  if (/Linux/.test(ua)) return { os: "Linux", kind: "desktop" };
  return { os: null, kind: "desktop" };
}

export function describeDevice(userAgent: string | null): DeviceInfo {
  const ua = userAgent ?? "";
  const app = /S2Nova-Android\/[^\s]*\s*\(([^)]*)\)/.exec(ua);
  if (app) {
    const model = (app[1] ?? "").trim();
    return { name: `S2 Nova app · ${model || "Android"}`, kind: "phone" };
  }
  if (/^okhttp\//i.test(ua)) return { name: "S2 Nova app · Android", kind: "phone" };

  const browser = BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
  const { os, kind } = osOf(ua);
  if (browser && os) return { name: `${browser} · ${os}`, kind };
  return { name: browser ?? os, kind };
}
