/**
 * Generates AI analysis via Claude Haiku.
 * Used for both country tournament summaries and individual player profiles.
 * Requires VITE_ANTHROPIC_API_KEY; degrades gracefully without it.
 */

import { useState } from "react";
import Anthropic from "@anthropic-ai/sdk";
import type { GroupStandings } from "./useCountryData";
import type { LiveScore } from "./useLiveData";
import type { Match } from "../matches";

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

function buildCountryPrompt(
  country: string,
  groupStandings: GroupStandings | null,
  scores: Record<string, LiveScore>,
  allMatches: Match[]
): string {
  const group = groupStandings?.groupName ?? "unknown group";

  const standingsStr = (groupStandings?.rows ?? [])
    .map((r) => `  ${r.pos}. ${r.team} — ${r.pts}pts (W${r.w} D${r.d} L${r.l}, GF${r.gf} GA${r.ga})`)
    .join("\n");

  const countryMatches = allMatches.filter(
    (m) => m.home.toLowerCase() === country.toLowerCase() || m.away.toLowerCase() === country.toLowerCase()
  );

  const resultsStr = countryMatches
    .map((m: Match) => {
      const s = scores[m.id];
      if (!s || s.status === "scheduled") return `  ${m.home} vs ${m.away} — not yet played`;
      return `  ${m.home} ${s.home}–${s.away} ${m.away}`;
    })
    .join("\n") || "  No results available yet";

  return `You are a sharp FIFA World Cup 2026 analyst. Generate a concise, honest, opinionated analysis for ${country} in the 2026 FIFA World Cup.

Today's date: ${new Date().toDateString()}.

${group.toUpperCase()} STANDINGS:
${standingsStr || "  Not available"}

${country.toUpperCase()}'S MATCHES:
${resultsStr}

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
    groupStandings: GroupStandings | null,
    scores: Record<string, LiveScore>,
    customPrompt?: string,
    allMatches: Match[] = []
  ) {
    if (!hasKey) return;

    setLoading(true);
    setData(null);
    setError(null);

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

      const prompt = customPrompt
        ? buildPlayerPrompt(subject, customPrompt)
        : buildCountryPrompt(subject, groupStandings, scores, allMatches);

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
