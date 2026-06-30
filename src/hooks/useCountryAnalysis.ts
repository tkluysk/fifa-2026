/**
 * Generates AI analysis via Claude Sonnet.
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

export const ANALYSIS_MODEL = "claude-sonnet-4-6";

const ESPN_STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";
const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260612-20260720&limit=200";

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
  const groupLines: string[] = [];
  const knockoutLines: string[] = [];

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

    const altNote = (comp.altGameNote as string) ?? "";
    const noteHeadline: string = (comp.notes as { headline?: string }[] | undefined)?.[0]?.headline ?? "";
    const isKnockout = !altNote.match(/Group [A-L]/i) && !noteHeadline.toLowerCase().startsWith("group");
    const roundLabel = noteHeadline || altNote || (isKnockout ? "Knockout round" : "Group stage");

    let line: string;
    if (completed) {
      line = `  ${home} ${homeScore}–${awayScore} ${away} [FINAL] (${roundLabel})`;
    } else if (state === "in") {
      const min = clock ? ` ${clock}${period === 2 ? " ET" : ""}` : "";
      line = `  ${home} ${homeScore}–${awayScore} ${away} [LIVE${min}] (${roundLabel})`;
    } else {
      const dt = new Date(event.date as string);
      line = `  ${home} vs ${away} — ${dt.toUTCString()} (${roundLabel})`;
    }

    (isKnockout ? knockoutLines : groupLines).push(line);
  }

  const matchResults = [
    "GROUP STAGE MATCHES:",
    groupLines.length ? groupLines.join("\n") : "  None yet",
    "",
    "KNOCKOUT STAGE MATCHES:",
    knockoutLines.length ? knockoutLines.join("\n") : "  None yet",
  ].join("\n");

  return {
    groupName,
    standings: standingsStr || "  Not available",
    matchResults,
  };
}

function buildCountryPrompt(
  country: string,
  ctx: LiveContext,
): string {
  return `You are a sharp FIFA World Cup 2026 analyst. Generate a concise, honest, opinionated analysis for ${country} in the 2026 FIFA World Cup. Use web search to find the latest news, injury updates, and match reports before writing — your analysis should reflect real current information, not just the data below.

TODAY: ${new Date().toUTCString()} — the data below is live and up-to-the-minute.

${ctx.groupName.toUpperCase()} STANDINGS (current):
${ctx.standings}

${country.toUpperCase()}'S MATCHES (current — split by stage):
${ctx.matchResults}

RULES:
- 48 teams, 12 groups of 4. Top 2 advance; best 8 third-placers also advance. Only 4th is out.
- Matches are split into GROUP STAGE and KNOCKOUT STAGE sections below. Never confuse the two.
- [FINAL] = confirmed result. [LIVE] = in progress, score provisional.
- Do not invent results. Do not discuss group qualification if the team is already in the knockout stage.

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

      const webSearch = {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 2,
      } as const;

      const msg = await client.messages.create({
        model: ANALYSIS_MODEL,
        max_tokens: 1200,
        tools: [webSearch],
        messages: [{ role: "user", content: prompt }],
      });

      // Response includes web_search_tool_result blocks (server-side) + text blocks — extract text only
      const raw = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("");
      const jsonStr = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
      setData(JSON.parse(jsonStr) as Analysis);
    } catch (e) {
      console.error("[analysis error]", e);
      setError("Analysis unavailable. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, hasKey, fetchAnalysis };
}
