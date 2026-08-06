import { Injectable, type LoggerService } from '@nestjs/common';
import { correlationId } from './correlation-context.js';
import { redactTelemetry, redactTelemetryText } from './safe-telemetry.js';

type LogLevel = 'debug' | 'error' | 'fatal' | 'info' | 'warn';

@Injectable()
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
      message: redactTelemetry(message),
      ...(context === undefined ? {} : { context }),
      ...(trace === undefined ? {} : { trace: redactTelemetryText(trace) }),
      ...(correlationId() === undefined ? {} : { correlationId: correlationId() }),
    };
    const output = JSON.stringify(event);
    if (level === 'error' || level === 'fatal') process.stderr.write(`${output}\n`);
    else process.stdout.write(`${output}\n`);
  }
}
