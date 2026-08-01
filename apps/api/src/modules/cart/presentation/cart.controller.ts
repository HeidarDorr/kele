import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApplicationError } from '../../../shared/application-error.js';
import { CartService } from '../application/cart.service.js';
import { CartAccessResolver } from './cart-access.js';
import { CartLineDto, CartQuantityDto } from '../../identity/presentation/identity.dto.js';

function parseVersion(value: string | undefined): number {
  if (value === undefined || !/^"[0-9]+"$/.test(value)) {
    throw new ApplicationError(
      'validation',
      'INVALID_IF_MATCH',
      'If-Match must be a quoted cart version.',
    );
  }
  return Number(value.slice(1, -1));
}

@Controller('cart')
export class CartController {
  constructor(
    private readonly carts: CartService,
    private readonly access: CartAccessResolver,
  ) {}

  @Get()
  async getCart(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return (await this.access.resolve(request, response, false)).cart;
  }

  @Post('lines')
  async addLine(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: CartLineDto,
  ) {
    const access = await this.access.resolve(request, response, true);
    return this.carts.addLine(access.cartId, parseVersion(ifMatch), body.toDomain());
  }

  @Patch('lines/:lineId')
  async updateLine(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('lineId', new ParseUUIDPipe()) lineId: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: CartQuantityDto,
  ) {
    const access = await this.access.resolve(request, response, true);
    return this.carts.updateLine(access.cartId, lineId, parseVersion(ifMatch), body.quantity);
  }

  @Delete('lines/:lineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeLine(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('lineId', new ParseUUIDPipe()) lineId: string,
    @Headers('if-match') ifMatch: string | undefined,
  ): Promise<void> {
    const access = await this.access.resolve(request, response, true);
    await this.carts.removeLine(access.cartId, lineId, parseVersion(ifMatch));
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('if-match') ifMatch: string | undefined,
  ): Promise<void> {
    const access = await this.access.resolve(request, response, true);
    await this.carts.clear(access.cartId, parseVersion(ifMatch));
  }
}
