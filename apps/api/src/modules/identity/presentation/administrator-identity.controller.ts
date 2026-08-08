import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { correlationId } from '../../../platform/observability/correlation-context.js';
import { AdministratorIdentityService } from '../application/administrator-identity.service.js';
import {
  ADMIN_SESSION_COOKIE,
  AdministratorCookieSecurity,
} from '../infrastructure/administrator-cookie-security.js';
import {
  AdminSessionGuard,
  type CatalogAdminRequest,
} from '../../catalog/presentation/admin-session.guard.js';
import {
  AdministratorOtpChallengeDto,
  AdministratorOtpVerificationDto,
} from './administrator-identity.dto.js';
import { OtpVerificationRateLimitGuard } from '../../../platform/security/abuse-rate-limit.guards.js';

function requestCorrelationId(): string {
  return correlationId() ?? randomUUID();
}

@Controller('admin/auth')
export class AdministratorIdentityController {
  constructor(
    private readonly identity: AdministratorIdentityService,
    private readonly cookies: AdministratorCookieSecurity,
  ) {}

  @Post('otp/challenges')
  @HttpCode(HttpStatus.ACCEPTED)
  createChallenge(@Body() body: AdministratorOtpChallengeDto, @Req() request: Request) {
    return this.identity.createChallenge({
      mobile: body.mobile,
      ip: request.ip ?? 'unknown',
      correlationId: requestCorrelationId(),
    });
  }

  @Post('otp/verifications')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OtpVerificationRateLimitGuard)
  async verify(
    @Body() body: AdministratorOtpVerificationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.identity.verify({
      challengeId: body.challengeId,
      code: body.code,
      correlationId: requestCorrelationId(),
    });
    this.cookies.setSession(response, result.sessionToken, result.csrfToken);
    return { administrator: result.administrator };
  }

  @Delete('session')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminSessionGuard)
  async logout(
    @Req() request: CatalogAdminRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.identity.logout(
      request.rawAdministratorSessionToken ??
        this.cookies.read(request, ADMIN_SESSION_COOKIE) ??
        '',
      requestCorrelationId(),
    );
    this.cookies.clear(response);
  }
}
