import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLayout, WidgetPosition } from './entities/user-layout.entity';

@Injectable()
export class UserLayoutService {
  constructor(
    @InjectRepository(UserLayout)
    private layoutRepository: Repository<UserLayout>,
  ) {}

  async findAll(userId: string): Promise<UserLayout[]> {
    return this.layoutRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(userId: string, layoutId: string): Promise<UserLayout> {
    const layout = await this.layoutRepository.findOne({
      where: { id: layoutId, userId },
    });
    if (!layout) {
      throw new NotFoundException('Layout not found');
    }
    return layout;
  }

  async findByName(userId: string, name: string): Promise<UserLayout | null> {
    return this.layoutRepository.findOne({
      where: { userId, name },
    });
  }

  async findDefault(userId: string): Promise<UserLayout | null> {
    return this.layoutRepository.findOne({
      where: { userId, isDefault: true },
    });
  }

  async create(
    userId: string,
    name: string,
    widgets: WidgetPosition[],
    isDefault = false,
  ): Promise<UserLayout> {
    // Check for duplicate name
    const existing = await this.findByName(userId, name);
    if (existing) {
      throw new ConflictException('A layout with this name already exists');
    }

    // If setting as default, unset any existing default
    if (isDefault) {
      await this.layoutRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const layout = this.layoutRepository.create({
      userId,
      name,
      widgets,
      isDefault,
    });
    return this.layoutRepository.save(layout);
  }

  async update(
    userId: string,
    layoutId: string,
    updates: { name?: string; widgets?: WidgetPosition[]; isDefault?: boolean },
  ): Promise<UserLayout> {
    const layout = await this.findOne(userId, layoutId);

    // Check for duplicate name if name is being changed
    if (updates.name && updates.name !== layout.name) {
      const existing = await this.findByName(userId, updates.name);
      if (existing) {
        throw new ConflictException('A layout with this name already exists');
      }
    }

    // If setting as default, unset any existing default
    if (updates.isDefault) {
      await this.layoutRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(layout, updates);
    return this.layoutRepository.save(layout);
  }

  async delete(userId: string, layoutId: string): Promise<void> {
    const layout = await this.findOne(userId, layoutId);
    await this.layoutRepository.remove(layout);
  }

  async setDefault(userId: string, layoutId: string): Promise<UserLayout> {
    // Unset any existing default
    await this.layoutRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    // Set the new default
    const layout = await this.findOne(userId, layoutId);
    layout.isDefault = true;
    return this.layoutRepository.save(layout);
  }
}
