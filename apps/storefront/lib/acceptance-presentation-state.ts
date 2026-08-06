export const acceptanceStateHeader = 'x-kele-e2e-presentation-state';
export const acceptanceTokenHeader = 'x-kele-e2e-presentation-token';

export function resolveAcceptancePresentationState<const State extends string>(
  headers: Pick<Headers, 'get'>,
  expectedToken: string | undefined,
  allowedStates: readonly State[],
): State | null {
  if (!expectedToken || headers.get(acceptanceTokenHeader) !== expectedToken) return null;

  const requestedState = headers.get(acceptanceStateHeader);
  return allowedStates.find((state) => state === requestedState) ?? null;
}
