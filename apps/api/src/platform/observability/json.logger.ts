import { LoggerService } from '@nestjs/common';
import { correlationId } from './correlation-context.js';

type LogLevel = 'debug' | 'error' | 'fatal' | 'info' | 'warn';

export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  fatal(message: unknown, context?: string): void {
    this.write('fatal', message, context);
  }

  private write(level: LogLevel, message: unknown, context?: string, trace?: string): void {
    const event = {
      timestamp: new Date().toISOString(),
      level,
      message: redact(message),
      ...(context === undefined ? {} : { context }),
      ...(trace === undefined ? {} : { trace }),
      ...(correlationId() === undefined ? {} : { correlationId: correlationId() }),
    };
    const output = JSON.stringify(event);
    if (level === 'error' || level === 'fatal') process.stderr.write(`${output}\n`);
    else process.stdout.write(`${output}\n`);
  }
}

function redact(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return value.map(redact);

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      /token|secret|password|mobile|address|authorization/i.test(key)
        ? '[REDACTED]'
        : redact(entry),
    ]),
  );
}
