import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { IdentityService } from '../application/identity.service.js';
import { CustomerService } from '../application/customer.service.js';
import {
  CART_COOKIE,
  CookieSecurity,
  CSRF_COOKIE,
  SESSION_COOKIE,
} from '../infrastructure/cookie-security.js';
import { CartAccessResolver } from '../../cart/presentation/cart-access.js';
import {
  AddressDto,
  OtpChallengeDto,
  OtpVerificationDto,
  ProfileUpdateDto,
} from './identity.dto.js';
import {
  CustomerCsrfGuard,
  type CustomerRequest,
  CustomerSessionGuard,
} from './customer-session.guard.js';
import { OtpVerificationRateLimitGuard } from '../../../platform/security/abuse-rate-limit.guards.js';

@Controller('auth')
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly cookies: CookieSecurity,
    private readonly cartAccess: CartAccessResolver,
  ) {}

  @Post('otp/challenges')
  @HttpCode(HttpStatus.ACCEPTED)
  createChallenge(
    @Body() body: OtpChallengeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const deviceId = this.cookies.ensureDevice(request, response);
    if (this.cookies.read(request, SESSION_COOKIE) === null) {
      this.cookies.ensureAnonymousCsrf(request, response);
    }
    return this.identity.createOtpChallenge(body.mobile, request.ip ?? 'unknown', deviceId);
  }

  @Post('otp/verifications')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OtpVerificationRateLimitGuard)
  async verify(
    @Body() body: OtpVerificationDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const signedCart = this.cookies.read(request, CART_COOKIE);
    const guestCartId = this.cookies.verify(signedCart);
    const previousSessionToken = this.cookies.read(request, SESSION_COOKIE);
    if (signedCart !== null && guestCartId !== null) {
      this.cartAccess.assertAnonymousCsrf(request);
    } else if (previousSessionToken !== null) {
      const previousSession = await this.identity.resolveSession(previousSessionToken);
      if (previousSession !== null) {
        const csrfHeader = request.headers['x-csrf-token'];
        const csrf = Array.isArray(csrfHeader) ? null : (csrfHeader ?? null);
        const csrfCookie = this.cookies.read(request, CSRF_COOKIE);
        if (csrf === null || csrfCookie === null || csrf !== csrfCookie) {
          this.identity.assertCsrf(previousSession, null);
        }
        this.identity.assertCsrf(previousSession, csrf);
      }
    }
    const result = await this.identity.verifyOtp({
      challengeId: body.challengeId,
      code: body.code,
      previousSessionToken,
      guestCartId,
    });
    this.cookies.setSession(response, result.sessionToken);
    this.cookies.setSessionCsrf(response, result.csrfToken);
    this.cookies.clearCart(response);
    return {
      customer: result.customer,
      cart: result.cart,
      mergePerformed: result.mergePerformed,
    };
  }

  @Delete('session')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CustomerSessionGuard, CustomerCsrfGuard)
  async logout(
    @Req() request: CustomerRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.identity.logout(request.rawSessionToken);
    this.cookies.clearSession(response);
    this.cookies.clearCsrf(response);
  }
}

@Controller('me')
@UseGuards(CustomerSessionGuard)
export class CustomerController {
  constructor(private readonly customers: CustomerService) {}

  @Get()
  getProfile(@Req() request: CustomerRequest) {
    return this.customers.getCustomer(request.customerSession.customer.id);
  }

  @Patch()
  @UseGuards(CustomerCsrfGuard)
  updateProfile(@Req() request: CustomerRequest, @Body() body: ProfileUpdateDto) {
    return this.customers.updateCustomer(request.customerSession.customer.id, {
      ...(body.firstName === undefined ? {} : { firstName: body.firstName }),
      ...(body.lastName === undefined ? {} : { lastName: body.lastName }),
    });
  }

  @Get('addresses')
  listAddresses(@Req() request: CustomerRequest) {
    return this.customers.listAddresses(request.customerSession.customer.id);
  }

  @Post('addresses')
  @UseGuards(CustomerCsrfGuard)
  createAddress(@Req() request: CustomerRequest, @Body() body: AddressDto) {
    return this.customers.createAddress(request.customerSession.customer.id, body.toDomain());
  }

  @Patch('addresses/:addressId')
  @UseGuards(CustomerCsrfGuard)
  updateAddress(
    @Req() request: CustomerRequest,
    @Param('addressId', new ParseUUIDPipe()) addressId: string,
    @Body() body: AddressDto,
  ) {
    return this.customers.updateAddress(
      request.customerSession.customer.id,
      addressId,
      body.toDomain(),
    );
  }

  @Delete('addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CustomerCsrfGuard)
  deleteAddress(
    @Req() request: CustomerRequest,
    @Param('addressId', new ParseUUIDPipe()) addressId: string,
  ) {
    return this.customers.deleteAddress(request.customerSession.customer.id, addressId);
  }
}
