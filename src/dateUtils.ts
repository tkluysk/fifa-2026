export function isNewZealand(): boolean {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz === "Pacific/Auckland" || tz === "Pacific/Chatham";
}

export function userCity(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "Pacific/Auckland"
  return tz.split("/").pop()!.replace(/_/g, " ");             // → "Auckland"
}

export function formatLocalDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** Full date + city label as a single string (for non-JSX contexts like AI prompts). */
export function formatLocalTime(iso: string): string {
  return `${formatLocalDate(iso)} ${userCity()} time`;
}
