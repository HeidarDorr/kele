import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async isReady(): Promise<boolean> {
    try {
      await withTimeout(
        this.prisma.$queryRaw`SELECT 1`,
        Number(process.env.READINESS_TIMEOUT_MS ?? 1_000),
      );
      return true;
    } catch {
      return false;
    }
  }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Readiness check timed out.'));
        }, timeoutMs);
        timer.unref();
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
