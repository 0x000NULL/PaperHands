import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderAudit } from './entities/order-audit.entity';
import { OrderSide, OrderStatus, OrderType } from './enums/order.enums';
import { User } from '../users/entities/user.entity';
import { Position } from '../portfolio/entities/position.entity';
import { FinnhubService } from '../market-data/finnhub.service';
import { MarketHoursService } from '../common/services/market-hours.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockOrderRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockOrderAuditRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let mockUserRepository: {
    findOne: jest.Mock;
  };
  let mockPositionRepository: {
    findOne: jest.Mock;
  };
  let mockFinnhubService: { getQuote: jest.Mock };
  let mockMarketHoursService: {
    getCurrentSession: jest.Mock;
    calculateExpirationTime: jest.Mock;
  };
  let mockDataSource: { createQueryRunner: jest.Mock };
  let mockQueryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: {
      findOne: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
      remove: jest.Mock;
    };
  };

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    cashBalance: 100000,
  };

  const mockQuote = {
    symbol: 'AAPL',
    description: 'Apple Inc',
    last: 150,
    bid: 149.9,
    ask: 150.1,
    volume: 1000000,
    change: 2,
    change_percentage: 1.35,
    open: 148,
    high: 151,
    low: 147,
    close: 148,
  };

  beforeEach(async () => {
    mockOrderRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ reserved: null }),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockOrderAuditRepository = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
    };

    mockUserRepository = {
      findOne: jest.fn(),
    };

    mockPositionRepository = {
      findOne: jest.fn(),
    };

    mockFinnhubService = {
      getQuote: jest.fn(),
    };

    mockMarketHoursService = {
      getCurrentSession: jest.fn().mockReturnValue('regular'),
      calculateExpirationTime: jest.fn().mockReturnValue(null),
    };

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(OrderAudit),
          useValue: mockOrderAuditRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Position),
          useValue: mockPositionRepository,
        },
        {
          provide: FinnhubService,
          useValue: mockFinnhubService,
        },
        {
          provide: MarketHoursService,
          useValue: mockMarketHoursService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const createOrderDto = {
      symbol: 'aapl',
      side: OrderSide.BUY,
      quantity: 10,
      orderType: OrderType.MARKET,
    };

    it('should create a buy order successfully', async () => {
      mockFinnhubService.getQuote.mockResolvedValue(mockQuote);
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockUser) // User lookup
        .mockResolvedValueOnce(null); // Position lookup (for buy, this happens in updatePosition)
      mockQueryRunner.manager.create.mockReturnValue({
        id: 'order-123',
        userId: mockUser.id,
        symbol: 'AAPL',
        side: OrderSide.BUY,
        orderType: OrderType.MARKET,
        quantity: 10,
        filledQuantity: 10,
        filledPrice: 150.1,
        avgFillPrice: 150.1,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockQueryRunner.manager.save.mockResolvedValue(undefined);

      const result = await service.createOrder(mockUser.id!, createOrderDto);

      expect(mockFinnhubService.getQuote).toHaveBeenCalledWith('AAPL');
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.symbol).toBe('AAPL');
      expect(result.side).toBe(OrderSide.BUY);
    });

    it('should throw NotFoundException if quote not found', async () => {
      mockFinnhubService.getQuote.mockResolvedValue(null);

      await expect(
        service.createOrder(mockUser.id!, createOrderDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if price is invalid', async () => {
      mockFinnhubService.getQuote.mockResolvedValue({
        ...mockQuote,
        last: 0,
      });

      await expect(
        service.createOrder(mockUser.id!, createOrderDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insufficient funds for buy', async () => {
      mockFinnhubService.getQuote.mockResolvedValue(mockQuote);
      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        ...mockUser,
        cashBalance: 100, // Not enough for 10 shares at $150.1
      });

      await expect(
        service.createOrder(mockUser.id!, createOrderDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should return existing order if idempotency key matches', async () => {
      const existingOrder = {
        id: 'order-123',
        userId: mockUser.id,
        symbol: 'AAPL',
        side: OrderSide.BUY,
        orderType: OrderType.MARKET,
        quantity: 10,
        filledQuantity: 10,
        filledPrice: 150.1,
        avgFillPrice: 150.1,
        status: OrderStatus.FILLED,
        idempotencyKey: 'idempotency-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderRepository.findOne.mockResolvedValue(existingOrder);

      const result = await service.createOrder(mockUser.id!, {
        ...createOrderDto,
        idempotencyKey: 'idempotency-123',
      });

      expect(result.id).toBe('order-123');
      expect(mockFinnhubService.getQuote).not.toHaveBeenCalled();
    });
  });

  describe('getOrders', () => {
    it('should return list of orders for user', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          symbol: 'AAPL',
          side: OrderSide.BUY,
          orderType: OrderType.MARKET,
          quantity: 10,
          filledQuantity: 10,
          filledPrice: 150,
          avgFillPrice: 150,
          status: OrderStatus.FILLED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'order-2',
          symbol: 'GOOGL',
          side: OrderSide.SELL,
          orderType: OrderType.MARKET,
          quantity: 5,
          filledQuantity: 5,
          filledPrice: 2800,
          avgFillPrice: 2800,
          status: OrderStatus.FILLED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockOrderRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOrders),
      });

      const result = await service.getOrders(mockUser.id!);

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('should return empty array if no orders', async () => {
      mockOrderRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getOrders(mockUser.id!);

      expect(result).toEqual([]);
    });
  });
});
