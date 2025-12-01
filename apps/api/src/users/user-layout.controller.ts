import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UserLayoutService } from './user-layout.service';
import { CreateLayoutDto } from './dto/create-layout.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';

@Controller('layouts')
@UseGuards(JwtAuthGuard)
export class UserLayoutController {
  constructor(private readonly layoutService: UserLayoutService) {}

  @Get()
  async getLayouts(@CurrentUser() user: User) {
    return this.layoutService.findAll(user.id);
  }

  @Get('default')
  async getDefaultLayout(@CurrentUser() user: User) {
    return this.layoutService.findDefault(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLayout(@CurrentUser() user: User, @Body() dto: CreateLayoutDto) {
    return this.layoutService.create(
      user.id,
      dto.name,
      dto.widgets,
      dto.isDefault,
    );
  }

  @Get(':id')
  async getLayout(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.layoutService.findOne(user.id, id);
  }

  @Patch(':id')
  async updateLayout(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLayoutDto,
  ) {
    return this.layoutService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLayout(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.layoutService.delete(user.id, id);
  }

  @Post(':id/set-default')
  async setDefaultLayout(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.layoutService.setDefault(user.id, id);
  }
}
