/**
 * Generates a country tournament analysis via Claude (claude-haiku).
 *
 * Requires VITE_ANTHROPIC_API_KEY to be set; degrades gracefully without it.
 *
 * Returns:
 *   data    — parsed Claude response (or null)
 *   loading — true while generating
 *   error   — error message if generation failed
 *   hasKey  — whether the API key is configured
 *   fetch   — call this with (country, liveData) to trigger generation
 */

import { useState } from "react";
import Anthropic from "@anthropic-ai/sdk";
import type { GroupRow } from "../countryInfo";
import type { LiveScore } from "./useLiveData";
import { ALL_MATCHES } from "../matches";
import { COUNTRY_DATA } from "../countryInfo";

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

function buildPrompt(
  country: string,
  standings: GroupRow[] | null,
  scores: Record<string, LiveScore>
): string {
  const data = COUNTRY_DATA[country];
  const standingsStr = (standings ?? data?.groupTable ?? [])
    .map((r) => `  ${r.pos}. ${r.team} — ${r.pts}pts (W${r.w} D${r.d} L${r.l}, GF${r.gf} GA${r.ga})`)
    .join("\n");

  const resultsStr = (data?.results ?? [])
    .map((r) => {
      const matchId = ALL_MATCHES.find(
        (m) =>
          m.home.toLowerCase() === r.home.toLowerCase() &&
          m.away.toLowerCase() === r.away.toLowerCase()
      )?.id;
      const live = matchId ? scores[matchId] : undefined;
      const score = live?.status !== "scheduled"
        ? `${live?.home ?? r.homeScore}–${live?.away ?? r.awayScore}`
        : `${r.homeScore}–${r.awayScore}`;
      return `  ${r.home} ${score} ${r.away} (${r.scorers})`;
    })
    .join("\n");

  return `You are a sharp FIFA World Cup 2026 analyst. Generate a concise, honest, opinionated analysis for ${country} in Group G of the 2026 FIFA World Cup.

Today's date: ${new Date().toDateString()}. The group stage final round is June 26–27, 2026.

GROUP G STANDINGS:
${standingsStr}

${country.toUpperCase()}'S MATCH RESULTS:
${resultsStr}

NEXT GAME:
${data?.nextGame ?? "Unknown"}

CONTEXT:
- Belgium and New Zealand play each other in the final group game (simultaneous with Egypt vs Iran)
- Top 2 teams advance directly; 3rd place may advance as one of the 8 best third-placed teams across all 12 groups
- Belgium took 23 shots without scoring against Iran (most in a World Cup game without scoring since 1994)
- Ngoy received a red card in Belgium's match against Iran
- New Zealand's Chris Just scored twice against Iran
- Egypt recorded their first World Cup win since 1934

Return ONLY valid JSON (no markdown, no commentary) in exactly this structure:
{
  "summary": "2–3 honest sentences about their tournament journey so far",
  "highlights": [
    {"type": "good"|"bad"|"neutral", "text": "one-line observation"},
    ... (3–5 items)
  ],
  "whatTheyNeed": "1–2 sentences on the exact results needed to advance",
  "prognosis": "2–3 sentences on their realistic chances for the rest of the tournament"
}`;
}

export function useCountryAnalysis() {
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  const hasKey = !!apiKey;

  async function fetchAnalysis(
    country: string,
    standings: GroupRow[] | null,
    scores: Record<string, LiveScore>
  ) {
    if (!hasKey) return;

    setLoading(true);
    setData(null);
    setError(null);

    try {
      const client = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true,
      });

      const prompt = buildPrompt(country, standings, scores);

      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = (msg.content[0] as { text: string }).text;
      // strip markdown code fences if present
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
