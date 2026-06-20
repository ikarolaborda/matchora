import { BaseHttpAdapter } from './base.js';

/** Sportradar adapter skeleton. Disabled unless SPORTRADAR_API_KEY set. */
export class SportradarAdapter extends BaseHttpAdapter {
  readonly name = 'sportradar';
  constructor(apiKey: string) {
    super(apiKey, 'https://api.sportradar.com/soccer/trial/v4');
  }
}
