export type RefundProviderResult = Readonly<{
  provider: 'fake';
  providerReference: string;
  status: 'confirmed' | 'pending' | 'failed';
  confirmedAt: Date | null;
  failureCode: string | null;
}>;

export interface RefundGateway {
  requestRefund(input: {
    providerTransactionId: string;
    amountRial: number;
    currency: 'IRR';
    idempotencyKey: string;
    correlationId: string;
    requestedAt: Date;
  }): Promise<RefundProviderResult>;
}
