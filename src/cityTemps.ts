// Average high temperatures (°C) in July for FIFA World Cup 2026 host cities.
// Source: historical climate averages.
const CITY_TEMPS: Record<string, number> = {
  "Toronto":                      27,
  "Vancouver":                    22,
  "Guadalajara":                  28,
  "Guadalupe":                    28,  // Monterrey metro
  "Mexico City":                  23,
  "Houston":                      35,
  "Arlington":                    37,  // Dallas-Fort Worth area
  "Kansas City":                  32,
  "Atlanta":                      31,
  "Miami Gardens":                32,  // Miami
  "Philadelphia":                 30,
  "East Rutherford":              29,  // New York
  "Foxborough":                   27,  // Boston area
  "Inglewood":                    27,  // Los Angeles
  "Santa Clara":                  26,  // San Francisco area
  "Seattle":                      24,
};

/**
 * Returns "~27°C" for a city string from ESPN, or null if unknown.
 * ESPN returns "City, State" for US cities — we match on the first word/segment.
 */
export function tempForCity(city: string): string | null {
  if (!city) return null;
  // Exact match first
  if (CITY_TEMPS[city] !== undefined) return `~${CITY_TEMPS[city]}°C`;
  // Try just the city part before the comma (e.g. "Inglewood, California" → "Inglewood")
  const bare = city.split(",")[0].trim();
  if (CITY_TEMPS[bare] !== undefined) return `~${CITY_TEMPS[bare]}°C`;
  return null;
}
