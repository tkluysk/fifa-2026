# Adapting the bracket engine to a new tournament

This app tracks a knockout tournament by combining a **fixed structural model**
of the bracket with **live data from a provider** (currently ESPN). This doc
captures how those two pieces fit together, the mistakes we made getting here,
and a checklist for pointing the framework at a future tournament.

## The core principle (learned the hard way)

> **The bracket structure is a fixed, published fact. The data provider is only
> a source of team identities, scores, dates, and venues — never of structure.**

The structure (which group placement feeds which knockout game, and how games
branch upward to the final) is defined by the tournament regulations *before a
ball is kicked* and never changes with results. Treat it as a hardcoded model.
Use the live provider only to answer "who is in this slot" and "what was the
score" — then propagate outcomes up the fixed model yourself.

## What went wrong first (so we don't repeat it)

We originally tried to *infer* the bracket structure from ESPN's data at runtime:

1. **Parsing ESPN's `"Round of 32 N Winner"` slot-label strings.** These are the
   provider's internal bracket bookkeeping. They are brittle: when a team wins,
   ESPN sometimes creates a *new* fixture with real names and leaves the old
   slot-label fixture stale, so the same team appeared to be in two places.
2. **Assuming `N` in `"Round of 32 N Winner"` was the Nth fixture by event ID.**
   It wasn't. ESPN orders event IDs by **kick-off time**, not bracket position,
   so this mapping was scrambled and produced a wrong hierarchy (teams in the
   wrong branches, orphaned games, a game with only one feeder).
3. **Patching symptoms** (guard against overwrites, orphan-repair passes) instead
   of fixing the root cause. Each patch moved the bug around.

The fix was to stop inferring and instead **encode the real bracket** and anchor
provider fixtures onto it. Symptoms vanished because the structure was finally
correct by construction.

## The architecture we landed on

- **`src/bracket2026.ts`** — the fixed model. Every knockout match keyed by its
  official match number, with:
  - each side expressed as a `Feeder` (a specific group winner `1X`, runner-up
    `2X`, third-place `3rd from {groups}`, or `winnerOf`/`loserOf` an earlier
    match), and
  - a `next` pointer to the match its winner feeds into.
  - `DEFINITE_SLOT_TO_MATCH` — every *definite* group slot (`1A`..`2L`) → the R32
    match it appears in. This is the anchor key.
- **`buildBracketTree(fixtures, gsMap)`** in `src/hooks/useLiveData.ts` — maps
  each provider fixture onto a model match number, then reads parent/feeder
  wiring straight from the model:
  1. **R32** — identify each fixture by its *definite* group slot. Every R32
     match has at least one side that is a specific group winner or runner-up
     (only the third-place side is a wildcard), so the definite slot uniquely
     names the match. Resolve a team → group slot from the standings.
  2. **R16 → Final** — propagate: a real team in a later-round fixture is the
     winner of an already-anchored feeder match, whose model `.next` names the
     current match. Iterate so QF/SF/Final resolve as their feeders play.
  3. **Leftover all-unplayed fixtures** — assign to the remaining model matches
     of their round by kick-off order. Best-effort, and self-corrects as games
     are played. (Structure still comes from the model, so this only affects
     which not-yet-playable fixture gets which date/venue.)

Everything downstream (`upstreamTeams`, `knockoutPathForCountry`, the full
bracket layout) walks the resulting ID→ID tree. No slot-label strings, no
reliance on provider ordering.

## Why anchor on the *definite* slot

The 8 best third-placed teams are assigned to R32 slots via a combination table
that only resolves once the group stage ends. That's the *only* dynamic part of
the bracket. Every group winner and runner-up slot is fixed permanently, so we
identify each R32 fixture by its winner/runner-up side and never need to resolve
the third-place wildcard to know which match a fixture is.

## Checklist: pointing this at a new tournament

1. **Find the authoritative structure.** Use the organiser's official match
   schedule (e.g. FIFA's match-schedule PDF), *not* Wikipedia or a bracket
   aggregator — we found Wikipedia's R16 wiring wrong in 6 of 8 matches, and
   even the official page's HTML was JS-rendered so we pulled the PDF. Cross-
   check against already-played results: the real games must fall where the
   model says.
2. **Write the model** (a new `bracketYYYY.ts`) with every knockout match:
   its round, both `Feeder`s, and its `next` pointer. Regenerate
   `DEFINITE_SLOT_TO_MATCH` from it.
3. **Confirm the number of stages / group count.** 2026 is 48 teams → 12 groups
   → Round of 32. A 32-team event has no R32; a 24-team event (e.g. the Euros)
   has a different third-place-combination table and different group letters.
   `Round` and the round list in `buildBracketTree` may need adjusting.
4. **Check provider specifics** for the new event:
   - The scoreboard/summary endpoints and the date ranges to query.
   - How the provider labels stages (`STAGE_LABELS`) and group-slot placeholders
     (`parseGroupSlotLabel`).
   - That standings team names match fixture team names (both go through
     `normaliseTeamName` here).
5. **Validate visually.** Fill the model with the current teams and render it as
   a bracket diagram; compare against an independent source before trusting it.
   (This is the step that caught our errors fastest.)
6. **Don't** reintroduce structure inference from provider slot labels or event
   ordering. If the model and the provider disagree, the model is right.

## The one honest caveat

Provider fixtures for games where *both* feeders are still unplayed can only be
matched to a model match by kick-off order (step 3 above) until a feeder plays.
Structure is always correct; only the date/venue attached to a specific
not-yet-playable fixture can be provisional. It resolves precisely as soon as one
feeder is decided. If you want it exact from the start, add official per-match
dates/venues to the model and match provider fixtures on those.
