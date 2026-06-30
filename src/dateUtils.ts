function userCity(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "Pacific/Auckland"
  const city = tz.split("/").pop()!.replace(/_/g, " ");       // → "Auckland"
  return city;
}

export function formatLocalTime(iso: string): string {
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
  return `${date} (${userCity()} time)`;
}
