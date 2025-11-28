import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a new order (market, limit, stop, stop-limit, or trailing stop)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @CurrentUser() user: User,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.id, createOrderDto);
  }

  /**
   * Get all orders with optional filters
   */
  @Get()
  async getOrders(@CurrentUser() user: User, @Query() query: QueryOrdersDto) {
    return this.ordersService.getOrders(user.id, query);
  }

  /**
   * Get all pending/open orders
   */
  @Get('pending')
  async getPendingOrders(@CurrentUser() user: User) {
    return this.ordersService.getPendingOrders(user.id);
  }

  /**
   * Get a single order by ID
   */
  @Get(':id')
  async getOrder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.getOrder(user.id, orderId);
  }

  /**
   * Get order audit history
   */
  @Get(':id/history')
  async getOrderHistory(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.getOrderHistory(user.id, orderId);
  }

  /**
   * Modify a pending order
   */
  @Patch(':id')
  async modifyOrder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.modifyOrder(user.id, orderId, updateOrderDto);
  }

  /**
   * Cancel a pending order
   */
  @Delete(':id')
  async cancelOrder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.cancelOrder(user.id, orderId);
  }
}
