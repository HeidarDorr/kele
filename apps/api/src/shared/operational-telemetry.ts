export type OperationalEventName =
  | 'exception'
  | 'job_execution'
  | 'otp_dispatch'
  | 'payment_callback'
  | 'payment_provider'
  | 'rate_limit'
  | 'refund_provider';

export type OperationalEvent = Readonly<{
  name: OperationalEventName;
  outcome: string;
  provider?: string;
}>;

export interface OperationalTelemetry {
  record(event: OperationalEvent): void;
}

export const OPERATIONAL_TELEMETRY = Symbol('OPERATIONAL_TELEMETRY');

export const noOperationalTelemetry: OperationalTelemetry = {
  record: () => undefined,
};
