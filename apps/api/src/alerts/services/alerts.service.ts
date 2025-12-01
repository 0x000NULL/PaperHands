import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Alert } from '../entities/alert.entity';
import { AlertType } from '../enums/alert-type.enum';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { UpdateAlertDto } from '../dto/update-alert.dto';
import { QueryAlertsDto } from '../dto/query-alerts.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
  ) {}

  async findAll(userId: string, query: QueryAlertsDto): Promise<Alert[]> {
    const where: FindOptionsWhere<Alert> = { userId };

    if (query.type) {
      where.type = query.type;
    }
    if (query.symbol) {
      where.symbol = query.symbol;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.alertRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return alert;
  }

  async create(userId: string, dto: CreateAlertDto): Promise<Alert> {
    const alert = this.alertRepository.create({
      userId,
      type: dto.type,
      symbol: dto.symbol?.toUpperCase(),
      condition: dto.condition,
      targetValue: dto.targetValue,
      greekType: dto.greekType,
      name: dto.name,
      isActive: true,
    });

    return this.alertRepository.save(alert);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAlertDto,
  ): Promise<Alert> {
    const alert = await this.findOne(userId, id);

    if (dto.condition !== undefined) {
      alert.condition = dto.condition;
    }
    if (dto.targetValue !== undefined) {
      alert.targetValue = dto.targetValue;
    }
    if (dto.greekType !== undefined) {
      alert.greekType = dto.greekType;
    }
    if (dto.isActive !== undefined) {
      alert.isActive = dto.isActive;
      // Clear triggeredAt when re-activating
      if (dto.isActive) {
        alert.triggeredAt = null;
      }
    }
    if (dto.name !== undefined) {
      alert.name = dto.name;
    }

    return this.alertRepository.save(alert);
  }

  async delete(userId: string, id: string): Promise<void> {
    const alert = await this.findOne(userId, id);
    await this.alertRepository.remove(alert);
  }

  async reactivate(userId: string, id: string): Promise<Alert> {
    const alert = await this.findOne(userId, id);
    alert.isActive = true;
    alert.triggeredAt = null;
    alert.lastCheckedValue = null;
    return this.alertRepository.save(alert);
  }

  async deactivate(id: string): Promise<void> {
    await this.alertRepository.update(id, {
      isActive: false,
      triggeredAt: new Date(),
    });
  }

  async findAllActiveBySymbol(symbol: string): Promise<Alert[]> {
    return this.alertRepository.find({
      where: { symbol, isActive: true },
    });
  }

  async findAllActive(): Promise<Alert[]> {
    return this.alertRepository.find({
      where: { isActive: true },
    });
  }

  async findActiveByType(type: AlertType): Promise<Alert[]> {
    return this.alertRepository.find({
      where: { type, isActive: true },
    });
  }

  async updateLastCheckedValue(id: string, value: number): Promise<void> {
    await this.alertRepository.update(id, { lastCheckedValue: value });
  }
}
