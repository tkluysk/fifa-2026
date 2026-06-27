import type { Match } from "./matches";
import { tvnzUrl } from "./matches";
import type { PotentialMatch } from "./potentialMatches";

function icsDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEnd(iso: string): string {
  return icsDate(new Date(new Date(iso).getTime() + 2 * 60 * 60 * 1000).toISOString());
}

function escape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function uid(id: string): string {
  return `${id}@fifa2026.app`;
}

function vevent(lines: string[]): string {
  return ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");
}

export function buildIcs(
  matches: Match[],
  potentialCountries: string[],
  potentialMatches: PotentialMatch[]
): string {
  const events: string[] = [];

  for (const m of matches) {
    const stream = tvnzUrl(m);
    const desc = [
      `Group ${m.group} — FIFA World Cup 2026`,
      stream ? `Watch on TVNZ+: ${stream}` : "",
    ]
      .filter(Boolean)
      .join("\\n");

    events.push(
      vevent([
        `UID:${uid(m.id)}`,
        `DTSTART:${icsDate(m.startUtc)}`,
        `DTEND:${icsEnd(m.startUtc)}`,
        `SUMMARY:⚽ ${escape(m.home)} vs ${escape(m.away)}`,
        `LOCATION:${escape(m.venue)}`,
        `DESCRIPTION:${desc}`,
      ])
    );
  }

  for (const country of potentialCountries) {
    for (const p of potentialMatches) {
      for (const opt of p.options) {
        events.push(
          vevent([
            `UID:${uid(`${p.id}-${country}-${opt.condition}`)}`,
            `DTSTART:${icsDate(opt.startUtc)}`,
            `DTEND:${icsEnd(opt.startUtc)}`,
            `SUMMARY:⚽ [Potential] ${escape(p.stage)} — ${escape(country)} vs ${escape(opt.opponent)}`,
            `LOCATION:${escape(opt.venue)}`,
            `DESCRIPTION:${escape(opt.condition)}\\nDate may change depending on group results.`,
          ])
        );
      }
    }
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FIFA 2026 App//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:FIFA World Cup 2026",
    "X-WR-TIMEZONE:UTC",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
