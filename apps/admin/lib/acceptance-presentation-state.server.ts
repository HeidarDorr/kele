import { headers } from 'next/headers';
import { resolveAcceptancePresentationState } from './acceptance-presentation-state';

export async function getAcceptancePresentationState<const State extends string>(
  allowedStates: readonly State[],
): Promise<State | null> {
  return resolveAcceptancePresentationState(
    await headers(),
    process.env.KELE_E2E_PRESENTATION_TOKEN,
    allowedStates,
  );
}
