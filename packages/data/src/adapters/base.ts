/**
 * Shared adapter scaffolding for external providers. Each concrete adapter is
 * disabled unless its API key is present and throws a clear "not implemented"
 * for the MVP — the mock provider is the only fully-wired runtime path.
 */

import type { FootballDataProvider } from '../provider.js';

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} adapter is not configured (missing API key) or not implemented in this MVP.`);
    this.name = 'ProviderNotConfiguredError';
  }
}

export abstract class BaseHttpAdapter implements Partial<FootballDataProvider> {
  abstract readonly name: string;
  protected constructor(
    protected readonly apiKey: string,
    protected readonly baseUrl: string,
  ) {}

  protected notImplemented(): never {
    throw new ProviderNotConfiguredError(this.name);
  }
}
