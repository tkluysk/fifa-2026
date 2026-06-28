/**
 * Fetches player photos for teams with poor coverage.
 * Priority order based on team popularity / WC 2026 prominence.
 * Uses ESPN short names (e.g. "L. Messi") to match what the app displays.
 *
 * Run: node scripts/fetch-missing-photos.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

const env = readFileSync(join(root, ".env.local"), "utf8");
const keyMatch = env.match(/API_FOOTBALL_KEY=(.+)/);
if (!keyMatch) { console.error("API_FOOTBALL_KEY not found"); process.exit(1); }
const API_KEY = keyMatch[1].trim();

// Load existing photos
const photosPath = join(root, "src/playerPhotos.ts");
const existing = readFileSync(photosPath, "utf8");
const existingKeys = new Set([...existing.matchAll(/"([^"]+)":\s+"https/g)].map(m => m[1]));
console.log(`Existing: ${existingKeys.size} players`);

// Priority teams: API-Football ID → ESPN team ID, ordered by importance
const PRIORITY = [
  { name: "Argentina",    apifId: 26,   espnId: 202 },
  { name: "Brazil",       apifId: 6,    espnId: 205 },
  { name: "France",       apifId: 2,    espnId: 478 },
  { name: "England",        apifId: 10,   espnId: 448 },
  { name: "Germany",        apifId: 25,   espnId: 481 },
  { name: "Portugal",       apifId: 27,   espnId: 482 },
  { name: "Netherlands",    apifId: 1118, espnId: 449 },
  { name: "USA",            apifId: 2384, espnId: 660 },
  { name: "Mexico",         apifId: 16,   espnId: 203 },
  { name: "Colombia",       apifId: 32,   espnId: 208 },
  { name: "Uruguay",        apifId: 7,    espnId: 212 },
  { name: "Morocco",        apifId: 31,   espnId: 2869 },
  { name: "Senegal",        apifId: 13,   espnId: 654 },
  { name: "Japan",          apifId: 12,   espnId: 627 },
  { name: "Korea Republic", apifId: 17,   espnId: 451 },
];

const BASE = "https://v3.football.api-sports.io";
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchEspnRoster(espnId) {
  try {
    const r = await fetch(`${ESPN}/${espnId}/roster`);
    if (!r.ok) return {};
    const d = await r.json();
    // Build fullName → shortName map
    const map = {};
    for (const a of d.athletes ?? []) {
      const full = a.displayName ?? "";
      const short = a.shortName ?? "";
      if (full && short) map[full] = short;
    }
    return map;
  } catch { return {}; }
}

async function fetchApifSquad(apifId) {
  const url = `${BASE}/players/squads?team=${apifId}`;
  const r = await fetch(url, { headers: { "x-apisports-key": API_KEY } });
  if (!r.ok) {
    if (r.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(`HTTP ${r.status}`);
  }
  const d = await r.json();
  const players = d.response?.[0]?.players ?? [];
  return players.map(p => ({
    name: p.name ?? "",
    id: p.id,
  }));
}

// Normalise name for fuzzy matching: lowercase, strip accents, collapse spaces
function norm(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

// Match API-Football full name to ESPN short name.
// ESPN short names look like "L. Messi" — first initial + last name.
function matchName(apifName, espnMap) {
  // Direct match
  if (espnMap[apifName]) return espnMap[apifName];

  // Try: build "F. Lastname" from apifName and see if it matches an ESPN short name
  const parts = apifName.split(" ");
  if (parts.length >= 2) {
    const initial = parts[0][0] + ".";
    const last = parts[parts.length - 1];
    const candidate = `${initial} ${last}`;
    if (Object.values(espnMap).includes(candidate)) return candidate;

    // Try all ESPN short names for fuzzy last-name match
    const normLast = norm(last);
    for (const [full, short] of Object.entries(espnMap)) {
      const shortParts = short.split(" ");
      if (shortParts.length >= 2 && norm(shortParts[shortParts.length - 1]) === normLast) {
        // also check first initial matches
        if (shortParts[0].startsWith(parts[0][0])) return short;
      }
    }
  }

  // Try single-name players (Neymar, Endrick, Vinicius Jr.)
  const normApif = norm(apifName);
  for (const short of Object.values(espnMap)) {
    if (norm(short) === normApif) return short;
  }

  return null;
}

const newPhotos = {};

for (const team of PRIORITY) {
  console.log(`\n[${team.name}] fetching ESPN roster…`);
  const espnMap = await fetchEspnRoster(team.espnId);
  console.log(`  ESPN: ${Object.keys(espnMap).length} players`);

  console.log(`[${team.name}] fetching API-Football squad…`);
  let players;
  try {
    players = await fetchApifSquad(team.apifId);
  } catch (e) {
    if (e.message === "RATE_LIMIT") {
      console.log("  Rate limited — waiting 15s…");
      await sleep(15000);
      try { players = await fetchApifSquad(team.apifId); }
      catch { console.log("  Still rate limited, skipping"); continue; }
    } else {
      console.log(`  Failed: ${e.message}`); continue;
    }
  }

  let added = 0, matched = 0;
  for (const p of players) {
    const espnShort = matchName(p.name, espnMap);
    if (!espnShort) continue;
    matched++;
    if (!existingKeys.has(espnShort)) {
      const url = `https://media.api-sports.io/football/players/${p.id}.png`;
      newPhotos[espnShort] = url;
      existingKeys.add(espnShort);
      added++;
    }
  }
  console.log(`  Matched ${matched}/${players.length} players, added ${added} new photos`);
  await sleep(200); // gentle rate limit
}

if (Object.keys(newPhotos).length === 0) {
  console.log("\nNo new photos to add.");
  process.exit(0);
}

// Merge into existing file
const newEntries = Object.entries(newPhotos)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, url]) => `  "${name}": "${url}",`)
  .join("\n");

// Insert before closing brace of PLAYER_PHOTOS
const updated = existing.replace(
  /(\n};[\s\n]*export function playerPhoto)/,
  `\n${newEntries}\n};\nexport function playerPhoto`
);

writeFileSync(photosPath, updated);
console.log(`\nAdded ${Object.keys(newPhotos).length} new photos → src/playerPhotos.ts`);
