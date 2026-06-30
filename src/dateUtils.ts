export function isNewZealand(): boolean {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz === "Pacific/Auckland" || tz === "Pacific/Chatham";
}

export function userCity(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "Pacific/Auckland"
  return tz.split("/").pop()!.replace(/_/g, " ");             // → "Auckland"
}

function localDayKey(d: Date): string {
  // "YYYY-MM-DD" in local tz — used to compare calendar days
  return d.toLocaleDateString("sv-SE");
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

/** Like formatLocalDate but substitutes "Today" / "Tomorrow" for the date portion. */
export function formatSmartDate(iso: string): string {
  const d = new Date(iso);
  const gameDay = localDayKey(d);
  const todayDay = localDayKey(new Date());
  const tomorrowDay = localDayKey(new Date(Date.now() + 864e5));
  const timeStr = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  if (gameDay === todayDay) return `Today, ${timeStr}`;
  if (gameDay === tomorrowDay) return `Tomorrow, ${timeStr}`;
  return formatLocalDate(iso);
}

/** Returns "Today" | "Tomorrow" | null — for use in day-header labels. */
export function relativeDayLabel(dayKey: string): "Today" | "Tomorrow" | null {
  const todayDay = localDayKey(new Date());
  const tomorrowDay = localDayKey(new Date(Date.now() + 864e5));
  if (dayKey === todayDay) return "Today";
  if (dayKey === tomorrowDay) return "Tomorrow";
  return null;
}

/** Full date + city label as a single string (for non-JSX contexts like AI prompts). */
export function formatLocalTime(iso: string): string {
  return `${formatLocalDate(iso)} ${userCity()} time`;
}
