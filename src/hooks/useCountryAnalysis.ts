/**
 * Generates AI analysis via Claude Haiku.
 * Fetches live ESPN standings + scores immediately before calling Claude
 * so the analysis is always grounded in up-to-the-minute data.
 */

import { useState } from "react";
import Anthropic from "@anthropic-ai/sdk";
import type { GroupStandings } from "./useCountryData";
import type { LiveScore } from "./useLiveData";
import type { Match } from "../matches";
import { normaliseTeamName } from "../matches";

export interface AnalysisHighlight {
  type: "good" | "bad" | "neutral";
  text: string;
}

export interface Analysis {
  summary: string;
  highlights: AnalysisHighlight[];
  whatTheyNeed: string;
  prognosis: string;
}

const ESPN_STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";
const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260612-20260630&limit=200";

interface LiveContext {
  groupName: string;
  standings: string;         // formatted multi-line
  matchResults: string;      // formatted multi-line
}

async function fetchLiveContext(country: string): Promise<LiveContext> {
  const [standRes, scoreRes] = await Promise.all([
    fetch(ESPN_STANDINGS),
    fetch(ESPN_SCOREBOARD),
  ]);

  const standJson = await standRes.json();
  const scoreJson = await scoreRes.json();

  // ── Parse standings ─────────────────────────────────────────────────────
  let groupName = "Unknown Group";
  let standingsStr = "";

  for (const group of standJson.children ?? []) {
    const rows = group.standings?.entries ?? [];
    const found = rows.some((e: { team: { displayName: string } }) =>
      normaliseTeamName(e.team.displayName) === country
    );
    if (!found) continue;

    groupName = group.name as string;
    const parsed = rows.map((e: {
      team: { displayName: string };
      stats: { abbreviation: string; value: number }[];
    }) => {
      const sm: Record<string, number> = {};
      for (const s of e.stats) sm[s.abbreviation] = s.value;
      const team = normaliseTeamName(e.team.displayName);
      return `  ${team} — ${sm["P"] ?? 0}pts W${sm["W"] ?? 0} D${sm["D"] ?? 0} L${sm["L"] ?? 0} GF${sm["F"] ?? 0} GA${sm["A"] ?? 0} GD${sm["GD"] ?? 0}${(sm["ADV"] ?? 0) === 1 ? " ✓ ADVANCED" : ""}`;
    });
    standingsStr = parsed.join("\n");
    break;
  }

  // ── Parse scoreboard for this country's matches ──────────────────────────
  const matchLines: string[] = [];
  for (const event of scoreJson.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const competitors: { homeAway: string; team: { displayName: string }; score: string }[] = comp.competitors ?? [];
    let home = "", away = "", homeScore = "", awayScore = "";
    for (const c of competitors) {
      const name = normaliseTeamName(c.team.displayName);
      if (c.homeAway === "home") { home = name; homeScore = c.score; }
      else { away = name; awayScore = c.score; }
    }
    if (home !== country && away !== country) continue;

    const status = comp.status?.type;
    const state = status?.state as string;
    const completed = !!status?.completed;
    const clock = comp.status?.displayClock as string | undefined;
    const period = comp.status?.period as number | undefined;

    if (completed) {
      matchLines.push(`  ${home} ${homeScore}–${awayScore} ${away} [FINAL]`);
    } else if (state === "in") {
      const min = clock ? ` (${clock}${period === 2 ? " ET" : ""})` : "";
      matchLines.push(`  ${home} ${homeScore}–${awayScore} ${away} [LIVE${min}]`);
    } else {
      const dt = new Date(event.date as string);
      const nzt = new Intl.DateTimeFormat("en-NZ", {
        timeZone: "Pacific/Auckland",
        weekday: "short", day: "numeric", month: "short",
        hour: "numeric", minute: "2-digit", hour12: true,
      }).format(dt);
      matchLines.push(`  ${home} vs ${away} — scheduled ${nzt} NZT`);
    }
  }

  return {
    groupName,
    standings: standingsStr || "  Not available",
    matchResults: matchLines.join("\n") || "  No matches found",
  };
}

function buildCountryPrompt(
  country: string,
  ctx: LiveContext,
): string {
  return `You are a sharp FIFA World Cup 2026 analyst. Generate a concise, honest, opinionated analysis for ${country} in the 2026 FIFA World Cup.

TODAY: ${new Date().toUTCString()} — the data below is live and up-to-the-minute.

${ctx.groupName.toUpperCase()} STANDINGS (current):
${ctx.standings}

${country.toUpperCase()}'S MATCHES (current):
${ctx.matchResults}

IMPORTANT TOURNAMENT RULES:
- This is the 2026 FIFA World Cup with 48 teams in 12 groups of 4.
- The top 2 from each group advance automatically (24 teams).
- The best 8 third-place finishers (out of 12) also advance — so finishing 3rd does NOT mean elimination.
- Only 4th-place finishers are definitely eliminated once their group is complete.
- A team finishing 3rd is still alive until all groups are complete and the 8 best 3rd-place teams are confirmed.
- Any match marked [LIVE] is in progress RIGHT NOW — factor in the current scoreline as provisional.
- Do NOT invent or assume results not listed above.
- Be mathematically precise about advancement scenarios.
- Standings listed include all completed goals and points.

Return ONLY valid JSON (no markdown, no commentary) in exactly this structure:
{
  "summary": "2–3 honest sentences about their tournament journey so far",
  "highlights": [
    {"type": "good"|"bad"|"neutral", "text": "one-line observation"},
    {"type": "good"|"bad"|"neutral", "text": "one-line observation"},
    {"type": "good"|"bad"|"neutral", "text": "one-line observation"}
  ],
  "whatTheyNeed": "1–2 sentences on the exact results needed to advance or their next challenge",
  "prognosis": "2–3 sentences on their realistic chances for the rest of the tournament"
}`;
}

function buildPlayerPrompt(_playerName: string, customPrompt: string): string {
  return `You are a FIFA World Cup 2026 analyst. ${customPrompt}

Return ONLY valid JSON (no markdown, no commentary) in exactly this structure:
{
  "summary": "3–4 punchy sentences about their career and path to this tournament",
  "highlights": [
    {"type": "good"|"bad"|"neutral", "text": "one-line career highlight or fact"},
    {"type": "good"|"bad"|"neutral", "text": "one-line career highlight or fact"},
    {"type": "good"|"bad"|"neutral", "text": "one-line career highlight or fact"}
  ],
  "whatTheyNeed": "What the player needs to do to make an impact in this tournament",
  "prognosis": "1–2 sentences on what to expect from them in this World Cup"
}`;
}

export function useCountryAnalysis() {
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  const hasKey = !!apiKey;

  async function fetchAnalysis(
    subject: string,
    // kept for API compatibility — live context is fetched fresh inside
    _groupStandings: GroupStandings | null,
    _scores: Record<string, LiveScore>,
    customPrompt?: string,
    _allMatches: Match[] = []
  ) {
    if (!hasKey) return;

    setLoading(true);
    setData(null);
    setError(null);

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

      let prompt: string;
      if (customPrompt) {
        prompt = buildPlayerPrompt(subject, customPrompt);
      } else {
        const ctx = await fetchLiveContext(subject);
        prompt = buildCountryPrompt(subject, ctx);
      }

      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = (msg.content[0] as { text: string }).text;
      const jsonStr = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
      setData(JSON.parse(jsonStr) as Analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate analysis.");
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, hasKey, fetchAnalysis };
}
