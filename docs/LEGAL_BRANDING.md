# Legal & Branding

MatchOra is an **independent** live-football-scores app. It is not affiliated with, endorsed by, or sponsored by FIFA or any tournament organizer. This document defines the constraints that keep the product legally clean and the practical guidance for staying that way.

## Constraints (must hold everywhere)

Do **not** use, imply, or reproduce any of the following:

- The **FIFA name**, acronym, or any FIFA word marks.
- FIFA (or any tournament/federation) **logos, emblems, crests, or marks**.
- The official tournament **mascot**.
- The official tournament **trophy** (name, image, or silhouette).
- Any language implying the app is **"official," "endorsed," "licensed,"** or otherwise affiliated.
- Federation / national-association **logos or crests** for teams.

The app uses only neutral, factual data (team names, country codes, fixtures, scores) and configurable, neutral labels.

## Required disclaimer

The independence disclaimer must be visible in the app (footer / about). The default text comes from `NEXT_PUBLIC_DISCLAIMER` and is surfaced via `getBranding().disclaimer`:

> **Independent live score application. Not affiliated with, endorsed by, or sponsored by FIFA or any tournament organizer.**

Keep the disclaimer present and unmodified in meaning if you re-theme or re-label the app.

## Neutral language guidance

- Refer to the event with the **configurable tournament label**, never the protected name. Default: `World Football Tournament 2026`.
- Use generic, descriptive phrasing: "the tournament," "the group stage," "the final," "matchday."
- Avoid words that imply officialness or partnership: "official," "presented by," "powered by [org]," "in partnership with."
- Team references use neutral display names and short codes (e.g. `BRA`) — factual identifiers, not branded marks.

## Configurable tournament label

The tournament name is **not hard-coded**. It is driven by an env var and read through config:

```bash
NEXT_PUBLIC_TOURNAMENT_LABEL=World Football Tournament 2026
```

`getBranding()` exposes `{ appName, tournamentLabel, disclaimer, apiBaseUrl }` (client-safe). Change the label per deployment without touching code. `Competition.name` is likewise a neutral, configurable label, not a protected mark.

## Flag / visual strategy

Teams are identified visually **without federation logos**:

- Derive an **emoji flag from the ISO country code** (`emojiFlag(countryCode)` in `@matchora/ui`), using the neutral `countryCode` field on `Team`/`Venue`.
- Where an emoji flag is unavailable or undesirable, fall back to **neutral team initials/short code** on a placeholder badge colored with the team's brand-safe `colorPrimary` / `colorSecondary` and the UI design tokens.
- **Never** ship federation crests, national-association logos, or sponsor marks.

`countryCode` exists only to derive the emoji-flag fallback — it carries no licensed imagery.

## Compliance checklist

Before shipping or re-theming, confirm:

- [ ] No FIFA name, acronym, or word mark anywhere (UI, copy, metadata, store listing).
- [ ] No FIFA/federation logos, emblems, crests, mascot, or trophy imagery or names.
- [ ] No "official," "endorsed," "licensed," or affiliation-implying language.
- [ ] Independence disclaimer is visible and intact in the running app.
- [ ] Tournament name comes only from `NEXT_PUBLIC_TOURNAMENT_LABEL` (neutral label).
- [ ] Team visuals use emoji flags (from ISO codes) or neutral initials + token colors — no crests/logos.
- [ ] Team names/codes are neutral factual identifiers, not branded marks.
- [ ] Store listing, screenshots, and marketing copy follow all of the above.
</content>
