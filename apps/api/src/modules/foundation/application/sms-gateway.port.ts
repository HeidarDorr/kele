export type SmsDispatch = Readonly<{
  provider: string;
  providerMessageId: string;
  accepted: true;
}>;

export interface SmsGateway {
  readonly provider: string;
  send(
    input: Readonly<{ mobile: string; message: string; correlationId: string }>,
  ): Promise<SmsDispatch>;
}
