export type SmsDispatch = Readonly<{
  provider: string;
  providerMessageId: string;
  accepted: true;
}>;

export type SmsDeliveryStatus = Readonly<{
  provider: string;
  providerMessageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'unknown';
}>;

export interface SmsGateway {
  readonly provider: string;
  sendOtp(
    input: Readonly<{ mobile: string; code: string; correlationId: string }>,
  ): Promise<SmsDispatch>;
  getDeliveryStatus(providerMessageId: string): Promise<SmsDeliveryStatus>;
}
