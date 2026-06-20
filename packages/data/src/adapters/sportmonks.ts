import { BaseHttpAdapter } from './base.js';

/**
 * Sportmonks adapter skeleton. Endpoints/normalization to be implemented when
 * SPORTMONKS_API_KEY is provided. See docs/DATA_PROVIDERS.md for the mapping plan.
 */
export class SportmonksAdapter extends BaseHttpAdapter {
  readonly name = 'sportmonks';
  constructor(apiKey: string) {
    super(apiKey, 'https://api.sportmonks.com/v3/football');
  }
  // getCompetitions/getFixtures/... map Sportmonks payloads → @matchora/shared types.
  // Intentionally unimplemented in the MVP.
}
