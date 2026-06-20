/**
 * Team display helper.
 *
 * The web API does NOT expose a /api/teams endpoint, so the mobile client only
 * receives team *ids* on fixtures and standings. In the mock dataset those ids
 * are shaped `team-<lowercase 3-letter code>` (e.g. `team-bra`). We derive a
 * compact display code + a best-effort emoji flag from the id. If a future
 * provider uses opaque ids this still degrades gracefully (initials fallback).
 *
 * NOTE: this is a presentation convenience for the MVP. When a real teams
 * endpoint exists, replace this with the canonical Team record (name, code,
 * countryCode, colors) and feed TeamBadge from it.
 */

/** Map 3-letter team codes → ISO 3166-1 alpha-2 for emoji flags (mock dataset). */
const CODE_TO_COUNTRY: Record<string, string> = {
  BRA: 'BR', ARG: 'AR', FRA: 'FR', ENG: 'GB', ESP: 'ES', GER: 'DE', POR: 'PT',
  NED: 'NL', BEL: 'BE', CRO: 'HR', URU: 'UY', MAR: 'MA', JPN: 'JP', KOR: 'KR',
  MEX: 'MX', USA: 'US', SEN: 'SN', COL: 'CO', SUI: 'CH', DEN: 'DK', SRB: 'RS',
  POL: 'PL', AUS: 'AU', CAN: 'CA', GHA: 'GH', ECU: 'EC', NGA: 'NG', CMR: 'CM',
};

export interface TeamDisplay {
  /** Compact code shown on badges, e.g. "BRA". */
  code: string;
  /** ISO alpha-2 country code, '' when unknown. */
  countryCode: string;
  /** First two letters for the initials fallback. */
  initials: string;
}

export function teamDisplay(teamId: string | null | undefined): TeamDisplay {
  if (!teamId) {
    return { code: 'TBD', countryCode: '', initials: '??' };
  }
  const suffix = teamId.startsWith('team-') ? teamId.slice(5) : teamId;
  const code = suffix.toUpperCase().slice(0, 3);
  return {
    code,
    countryCode: CODE_TO_COUNTRY[code] ?? '',
    initials: code.slice(0, 2),
  };
}
