/**
 * Returns a player headshot URL.
 * Priority:
 *   1. Static API-Football CDN map (baked in at build time, instant, reliable)
 *   2. Wikipedia REST API (CORS-open, no key, fragile but broad coverage)
 *   3. null (caller shows jersey number fallback)
 */

import { useState, useEffect } from "react";
import { playerPhoto } from "../playerPhotos";

const wikiCache: Record<string, string | null> = {};
const WIKI = "https://en.wikipedia.org/api/rest_v1/page/summary/";

export function usePlayerPhoto(playerName: string): string | null {
  // Check static map immediately — no async needed
  const staticUrl = playerPhoto(playerName) ?? null;
  const [wikiUrl, setWikiUrl] = useState<string | null>(null);

  useEffect(() => {
    // Already have a static photo — skip Wikipedia fetch
    if (staticUrl) return;

    if (playerName in wikiCache) {
      setWikiUrl(wikiCache[playerName]);
      return;
    }

    let cancelled = false;
    const slug = playerName.trim().replace(/\s+/g, "_");

    fetch(`${WIKI}${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const src: string | null = d?.thumbnail?.source ?? null;
        const sized = src ? src.replace(/\/\d+px-/, "/120px-") : null;
        wikiCache[playerName] = sized;
        setWikiUrl(sized);
      })
      .catch(() => {
        if (!cancelled) { wikiCache[playerName] = null; setWikiUrl(null); }
      });

    return () => { cancelled = true; };
  }, [playerName, staticUrl]);

  return staticUrl ?? wikiUrl;
}
