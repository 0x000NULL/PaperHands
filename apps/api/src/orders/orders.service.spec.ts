import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderSide, OrderStatus } from './entities/order.entity';
import { User } from '../users/entities/user.entity';
import { TradierService } from '../market-data/tradier.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockOrderRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let mockUserRepository: Record<string, jest.Mock>;
  let mockTradierService: { getQuote: jest.Mock };
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
    };

    mockUserRepository = {};

    mockTradierService = {
      getQuote: jest.fn(),
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
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: TradierService,
          useValue: mockTradierService,
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
    };

    it('should create a buy order successfully', async () => {
      mockTradierService.getQuote.mockResolvedValue(mockQuote);
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockUser) // User lookup
        .mockResolvedValueOnce(null); // Position lookup (for buy, this happens in updatePosition)
      mockQueryRunner.manager.create.mockReturnValue({
        id: 'order-123',
        userId: mockUser.id,
        symbol: 'AAPL',
        side: OrderSide.BUY,
        quantity: 10,
        filledPrice: 150.1,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      });
      mockQueryRunner.manager.save.mockResolvedValue(undefined);

      const result = await service.createOrder(mockUser.id!, createOrderDto);

      expect(mockTradierService.getQuote).toHaveBeenCalledWith('AAPL');
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.symbol).toBe('AAPL');
      expect(result.side).toBe(OrderSide.BUY);
    });

    it('should throw NotFoundException if quote not found', async () => {
      mockTradierService.getQuote.mockResolvedValue(null);

      await expect(
        service.createOrder(mockUser.id!, createOrderDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if price is invalid', async () => {
      mockTradierService.getQuote.mockResolvedValue({
        ...mockQuote,
        ask: 0,
        bid: 0,
      });

      await expect(
        service.createOrder(mockUser.id!, createOrderDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insufficient funds for buy', async () => {
      mockTradierService.getQuote.mockResolvedValue(mockQuote);
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
        quantity: 10,
        filledPrice: 150.1,
        status: OrderStatus.FILLED,
        idempotencyKey: 'idempotency-123',
        createdAt: new Date(),
      };

      mockOrderRepository.findOne.mockResolvedValue(existingOrder);

      const result = await service.createOrder(mockUser.id!, {
        ...createOrderDto,
        idempotencyKey: 'idempotency-123',
      });

      expect(result.id).toBe('order-123');
      expect(mockTradierService.getQuote).not.toHaveBeenCalled();
    });
  });

  describe('getOrders', () => {
    it('should return list of orders for user', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          symbol: 'AAPL',
          side: OrderSide.BUY,
          quantity: 10,
          filledPrice: 150,
          status: OrderStatus.FILLED,
          createdAt: new Date(),
        },
        {
          id: 'order-2',
          symbol: 'GOOGL',
          side: OrderSide.SELL,
          quantity: 5,
          filledPrice: 2800,
          status: OrderStatus.FILLED,
          createdAt: new Date(),
        },
      ];

      mockOrderRepository.find.mockResolvedValue(mockOrders);

      const result = await service.getOrders(mockUser.id!);

      expect(mockOrderRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('should return empty array if no orders', async () => {
      mockOrderRepository.find.mockResolvedValue([]);

      const result = await service.getOrders(mockUser.id!);

      expect(result).toEqual([]);
    });
  });
});
