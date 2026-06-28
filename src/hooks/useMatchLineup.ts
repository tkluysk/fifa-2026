import { useState, useEffect } from "react";

export interface LineupEntry {
  athleteId: string;
  name: string;
  jersey: string;
  starter: boolean;
  subbedIn: boolean;
  subbedOut: boolean;
  positionAbbr: string;
}

export interface MatchLineup {
  formation: string | null;
  players: LineupEntry[];
  teamDisplayName: string;
}

const cache: Record<string, MatchLineup | null> = {};

const ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";

export function useMatchLineup(eventId: string | null, teamName: string) {
  const [lineup, setLineup] = useState<MatchLineup | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) { setLineup(null); return; }
    const key = `${eventId}:${teamName}`;
    if (cache[key] !== undefined) { setLineup(cache[key]); return; }

    setLoading(true);
    fetch(`${ESPN_SUMMARY}?event=${eventId}`)
      .then(r => r.json())
      .then(d => {
        const rosters = (d.rosters ?? []) as {
          homeAway: string;
          team: { displayName: string };
          formation?: string;
          roster: {
            jersey?: string;
            starter: boolean;
            subbedIn?: boolean;
            subbedOut?: boolean;
            athlete: { id: string; displayName: string };
            position?: { abbreviation?: string };
          }[];
        }[];

        // Match by team name (normalise)
        const normalise = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
        const teamRoster = rosters.find(r =>
          normalise(r.team.displayName) === normalise(teamName) ||
          r.team.displayName.toLowerCase().includes(teamName.toLowerCase().split(" ")[0])
        ) ?? rosters[0];

        if (!teamRoster || !teamRoster.roster.length) {
          cache[key] = null;
          setLineup(null);
          return;
        }

        const result: MatchLineup = {
          formation: teamRoster.formation ?? null,
          teamDisplayName: teamRoster.team.displayName,
          players: teamRoster.roster.map(p => ({
            athleteId: p.athlete.id,
            name: p.athlete.displayName,
            jersey: p.jersey ?? "",
            starter: p.starter,
            subbedIn: p.subbedIn ?? false,
            subbedOut: p.subbedOut ?? false,
            positionAbbr: p.position?.abbreviation ?? "",
          })),
        };
        cache[key] = result;
        setLineup(result);
      })
      .catch(() => { cache[key] = null; setLineup(null); })
      .finally(() => setLoading(false));
  }, [eventId, teamName]);

  return { lineup, loading };
}
