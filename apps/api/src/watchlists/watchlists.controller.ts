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
import { User } from '../users/entities/user.entity';
import { WatchlistsService } from './watchlists.service';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';
import { AddSymbolDto } from './dto/add-symbol.dto';
import { ReorderItemsDto } from './dto/reorder-items.dto';

@Controller('watchlists')
@UseGuards(JwtAuthGuard)
export class WatchlistsController {
  constructor(private readonly watchlistsService: WatchlistsService) {}

  @Get()
  async getWatchlists(@CurrentUser() user: User) {
    return this.watchlistsService.getWatchlists(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWatchlist(
    @CurrentUser() user: User,
    @Body() dto: CreateWatchlistDto,
  ) {
    return this.watchlistsService.createWatchlist(user.id, dto.name);
  }

  @Get(':id')
  async getWatchlist(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.watchlistsService.getWatchlist(user.id, id);
  }

  @Patch(':id')
  async updateWatchlist(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWatchlistDto,
  ) {
    return this.watchlistsService.updateWatchlist(user.id, id, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWatchlist(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.watchlistsService.deleteWatchlist(user.id, id);
  }

  @Post(':id/symbols')
  @HttpCode(HttpStatus.CREATED)
  async addSymbol(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSymbolDto,
  ) {
    return this.watchlistsService.addSymbol(user.id, id, dto.symbol);
  }

  @Delete(':id/symbols/:symbol')
  async removeSymbol(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('symbol') symbol: string,
  ) {
    return this.watchlistsService.removeSymbol(user.id, id, symbol);
  }

  @Patch(':id/reorder')
  async reorderItems(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.watchlistsService.reorderItems(user.id, id, dto.itemIds);
  }
}
