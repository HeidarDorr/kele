export type PaymentIntent = Readonly<{
  reference: string;
  amountIrr: number;
  status: 'created';
}>;

export interface PaymentGateway {
  createIntent(
    input: Readonly<{ amountIrr: number; correlationId: string }>,
  ): Promise<PaymentIntent>;
}
