import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import { AdminOrdersService } from '../services/admin-orders.service';
import { QueryOrdersDto } from '../dto/query-orders.dto';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  async listOrders(@Query() query: QueryOrdersDto) {
    return this.adminOrdersService.findAllOrders(query);
  }

  @Get('stats')
  async getStatistics() {
    return this.adminOrdersService.getOrderStatistics();
  }

  @Get(':id')
  async getOrder(@Param('id', ParseUUIDPipe) orderId: string) {
    return this.adminOrdersService.findOrderById(orderId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN)
  async cancelOrder(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body('reason') reason: string,
    @Req() request: Request,
  ) {
    return this.adminOrdersService.cancelOrderAsAdmin(
      admin,
      orderId,
      reason,
      request,
    );
  }
}
