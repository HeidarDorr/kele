import { describe, expect, it } from 'vitest';

const prohibited = /from ['"]@nestjs\//;

describe('architecture boundaries', () => {
  it('recognizes forbidden framework imports in the domain/application layers', () => {
    expect(prohibited.test("import { Injectable } from '@nestjs/common';")).toBe(true);
    expect(
      prohibited.test("import type { PaymentGateway } from './payment-gateway.port.js';"),
    ).toBe(false);
  });
});
