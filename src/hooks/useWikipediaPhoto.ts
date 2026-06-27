/**
 * Fetches a player headshot from Wikipedia's public REST API.
 * CORS-open, no key required.
 * Falls back gracefully — if no article or no thumbnail found, returns null.
 */

import { useState, useEffect } from "react";

const cache: Record<string, string | null> = {};
const WIKI = "https://en.wikipedia.org/api/rest_v1/page/summary/";

function toSlug(name: string): string {
  return name.trim().replace(/\s+/g, "_");
}

export function useWikipediaPhoto(playerName: string): string | null {
  const [url, setUrl] = useState<string | null>(cache[playerName] ?? null);

  useEffect(() => {
    if (playerName in cache) {
      setUrl(cache[playerName]);
      return;
    }

    let cancelled = false;
    const slug = toSlug(playerName);

    fetch(`${WIKI}${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        // Resize to ~120px wide via Wikimedia thumb URL manipulation
        const src: string | null = d?.thumbnail?.source ?? null;
        const sized = src
          ? src.replace(/\/\d+px-/, "/120px-")
          : null;
        cache[playerName] = sized;
        setUrl(sized);
      })
      .catch(() => {
        if (!cancelled) {
          cache[playerName] = null;
          setUrl(null);
        }
      });

    return () => { cancelled = true; };
  }, [playerName]);

  return url;
}
