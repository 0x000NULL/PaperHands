import {
  Controller,
  Get,
  Patch,
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
import { AdminUsersService } from '../services/admin-users.service';
import { QueryUsersDto } from '../dto/query-users.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AdjustBalanceDto } from '../dto/adjust-balance.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  async listUsers(@Query() query: QueryUsersDto) {
    return this.adminUsersService.findAllUsers(query);
  }

  @Get(':id')
  async getUser(@Param('id', ParseUUIDPipe) userId: string) {
    return this.adminUsersService.getUserDetails(userId);
  }

  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN)
  async updateRole(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: Request,
  ) {
    return this.adminUsersService.changeUserRole(admin, userId, dto, request);
  }

  @Patch(':id/balance')
  async adjustBalance(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: AdjustBalanceDto,
    @Req() request: Request,
  ) {
    return this.adminUsersService.adjustCashBalance(
      admin,
      userId,
      dto,
      request,
    );
  }

  @Patch(':id/disable')
  async disableUser(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body('reason') reason: string,
    @Req() request: Request,
  ) {
    return this.adminUsersService.disableUser(admin, userId, reason, request);
  }

  @Patch(':id/enable')
  async enableUser(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) userId: string,
    @Req() request: Request,
  ) {
    return this.adminUsersService.enableUser(admin, userId, request);
  }
}
