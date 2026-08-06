export type RefundProviderResult = Readonly<{
  provider: string;
  providerReference: string;
  status: 'confirmed' | 'pending' | 'failed';
  confirmedAt: Date | null;
  failureCode: string | null;
}>;

export interface RefundGateway {
  readonly provider?: string;
  requestRefund(input: {
    providerTransactionId: string;
    amountRial: number;
    currency: 'IRR';
    idempotencyKey: string;
    correlationId: string;
    requestedAt: Date;
  }): Promise<RefundProviderResult>;
}
