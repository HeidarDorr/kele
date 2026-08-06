import type { Page, Response } from '@playwright/test';

const acceptanceStateHeader = 'x-kele-e2e-presentation-state';
const acceptanceTokenHeader = 'x-kele-e2e-presentation-token';

export async function gotoAcceptancePresentationState(
  page: Page,
  url: string,
  state: string,
): Promise<Response | null> {
  const token = process.env.KELE_E2E_PRESENTATION_TOKEN;
  if (!token) throw new Error('The E2E presentation token is unavailable.');

  await page.setExtraHTTPHeaders({
    [acceptanceStateHeader]: state,
    [acceptanceTokenHeader]: token,
  });
  try {
    return await page.goto(url);
  } finally {
    await page.setExtraHTTPHeaders({});
  }
}
