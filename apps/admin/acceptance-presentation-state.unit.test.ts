import { describe, expect, it } from 'vitest';
import {
  acceptanceStateHeader,
  acceptanceTokenHeader,
  resolveAcceptancePresentationState,
} from './lib/acceptance-presentation-state';

const allowedStates = ['loading', 'empty', 'error'] as const;

describe('administration acceptance presentation state', () => {
  it('is inert without the private runner token', () => {
    const headers = new Headers({
      [acceptanceStateHeader]: 'error',
      [acceptanceTokenHeader]: 'public-request-token',
    });

    expect(resolveAcceptancePresentationState(headers, undefined, allowedStates)).toBeNull();
    expect(resolveAcceptancePresentationState(headers, 'runner-token', allowedStates)).toBeNull();
  });

  it('accepts only an allow-listed state with the private runner token', () => {
    const validHeaders = new Headers({
      [acceptanceStateHeader]: 'loading',
      [acceptanceTokenHeader]: 'runner-token',
    });
    const invalidHeaders = new Headers({
      [acceptanceStateHeader]: 'success',
      [acceptanceTokenHeader]: 'runner-token',
    });

    expect(resolveAcceptancePresentationState(validHeaders, 'runner-token', allowedStates)).toBe(
      'loading',
    );
    expect(
      resolveAcceptancePresentationState(invalidHeaders, 'runner-token', allowedStates),
    ).toBeNull();
  });
});
