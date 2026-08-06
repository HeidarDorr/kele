import { describe, expect, it } from 'vitest';
import {
  acceptanceStateHeader,
  acceptanceTokenHeader,
  resolveAcceptancePresentationState,
} from './lib/acceptance-presentation-state';

const allowedStates = ['loading', 'empty', 'error'] as const;

describe('storefront acceptance presentation state', () => {
  it('is inert when the server has no E2E token', () => {
    const headers = new Headers({
      [acceptanceStateHeader]: 'error',
      [acceptanceTokenHeader]: 'public-request-token',
    });

    expect(resolveAcceptancePresentationState(headers, undefined, allowedStates)).toBeNull();
  });

  it('rejects missing, invalid and unsupported request values', () => {
    expect(
      resolveAcceptancePresentationState(
        new Headers({ [acceptanceStateHeader]: 'error' }),
        'runner-token',
        allowedStates,
      ),
    ).toBeNull();
    expect(
      resolveAcceptancePresentationState(
        new Headers({
          [acceptanceStateHeader]: 'error',
          [acceptanceTokenHeader]: 'wrong-token',
        }),
        'runner-token',
        allowedStates,
      ),
    ).toBeNull();
    expect(
      resolveAcceptancePresentationState(
        new Headers({
          [acceptanceStateHeader]: 'success',
          [acceptanceTokenHeader]: 'runner-token',
        }),
        'runner-token',
        allowedStates,
      ),
    ).toBeNull();
  });

  it('accepts an allow-listed state from the token-authenticated E2E runner', () => {
    const headers = new Headers({
      [acceptanceStateHeader]: 'empty',
      [acceptanceTokenHeader]: 'runner-token',
    });

    expect(resolveAcceptancePresentationState(headers, 'runner-token', allowedStates)).toBe(
      'empty',
    );
  });
});
