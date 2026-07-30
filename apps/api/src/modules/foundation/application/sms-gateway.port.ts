export type SmsDispatch = Readonly<{
  providerMessageId: string;
  accepted: true;
}>;

export interface SmsGateway {
  send(
    input: Readonly<{ mobile: string; message: string; correlationId: string }>,
  ): Promise<SmsDispatch>;
}
