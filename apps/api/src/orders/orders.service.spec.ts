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
import { OptionPosition } from '../portfolio/entities/option-position.entity';
import { FinnhubService } from '../market-data/finnhub.service';
import { TradierService } from '../market-data/tradier.service';
import { MarketHoursService } from '../common/services/market-hours.service';
import { TaxLotService } from '../portfolio/services/tax-lot.service';
import { OptionTaxService } from '../portfolio/services/option-tax.service';
import { OrderAuditService } from './services/order-audit.service';
import { OrderValidationService } from './services/order-validation.service';
import { OrderQueryService } from './services/order-query.service';

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
  let mockOptionPositionRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let mockFinnhubService: { getQuote: jest.Mock };
  let mockTradierService: { getOptionQuote: jest.Mock };
  let mockMarketHoursService: {
    getCurrentSession: jest.Mock;
    calculateExpirationTime: jest.Mock;
  };
  let mockTaxLotService: {
    createTaxLot: jest.Mock;
    sellSharesFIFO: jest.Mock;
  };
  let mockOptionTaxService: {
    recordOptionPurchase: jest.Mock;
    recordSoldToClose: jest.Mock;
    recordBuyToClose: jest.Mock;
  };
  let mockDataSource: { createQueryRunner: jest.Mock };
  let mockOrderAuditService: {
    createAuditRecord: jest.Mock;
    getAuditHistory: jest.Mock;
    formatAuditHistory: jest.Mock;
    orderToSnapshot: jest.Mock;
  };
  let mockOrderValidationService: {
    validateConditionalOrderPrices: jest.Mock;
    estimateOrderCost: jest.Mock;
    getAvailableCash: jest.Mock;
    getAvailableShares: jest.Mock;
    getAvailableOptionContracts: jest.Mock;
    validateSufficientFunds: jest.Mock;
    validateSufficientShares: jest.Mock;
  };
  let mockOrderQueryService: {
    getOrders: jest.Mock;
    getPendingOrders: jest.Mock;
    getOrder: jest.Mock;
    getOrderById: jest.Mock;
    getOrderByIdWithAuth: jest.Mock;
    getPendingConditionalOrders: jest.Mock;
    getActiveOrderSymbols: jest.Mock;
    formatOrderResponse: jest.Mock;
  };
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

    mockOptionPositionRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    mockFinnhubService = {
      getQuote: jest.fn(),
    };

    mockTradierService = {
      getOptionQuote: jest.fn(),
    };

    mockMarketHoursService = {
      getCurrentSession: jest.fn().mockReturnValue('regular'),
      calculateExpirationTime: jest.fn().mockReturnValue(null),
    };

    mockTaxLotService = {
      createTaxLot: jest.fn().mockResolvedValue({}),
      sellSharesFIFO: jest
        .fn()
        .mockResolvedValue({ totalRealized: 0, lotSales: [] }),
    };

    mockOptionTaxService = {
      recordOptionPurchase: jest.fn().mockResolvedValue({}),
      recordSoldToClose: jest.fn().mockResolvedValue({}),
      recordBuyToClose: jest.fn().mockResolvedValue({}),
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

    mockOrderAuditService = {
      createAuditRecord: jest.fn().mockResolvedValue({}),
      getAuditHistory: jest.fn().mockResolvedValue([]),
      formatAuditHistory: jest.fn().mockReturnValue([]),
      orderToSnapshot: jest.fn().mockReturnValue({}),
    };

    mockOrderValidationService = {
      validateConditionalOrderPrices: jest.fn(),
      estimateOrderCost: jest.fn().mockReturnValue(0),
      getAvailableCash: jest.fn().mockResolvedValue(100000),
      getAvailableShares: jest.fn().mockResolvedValue(0),
      getAvailableOptionContracts: jest.fn().mockResolvedValue(0),
      validateSufficientFunds: jest.fn().mockResolvedValue(undefined),
      validateSufficientShares: jest.fn().mockResolvedValue(undefined),
    };

    mockOrderQueryService = {
      getOrders: jest.fn().mockResolvedValue([]),
      getPendingOrders: jest.fn().mockResolvedValue([]),
      getOrder: jest.fn().mockResolvedValue({}),
      getOrderById: jest.fn().mockResolvedValue(null),
      getOrderByIdWithAuth: jest.fn().mockResolvedValue({}),
      getPendingConditionalOrders: jest.fn().mockResolvedValue([]),
      getActiveOrderSymbols: jest.fn().mockResolvedValue([]),
      formatOrderResponse: jest.fn().mockImplementation((order: Order) => ({
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        orderType: order.orderType,
        quantity: Number(order.quantity),
        filledQuantity: Number(order.filledQuantity),
        filledPrice: order.filledPrice ? Number(order.filledPrice) : null,
        avgFillPrice: order.avgFillPrice ? Number(order.avgFillPrice) : null,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
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
          provide: getRepositoryToken(OptionPosition),
          useValue: mockOptionPositionRepository,
        },
        {
          provide: FinnhubService,
          useValue: mockFinnhubService,
        },
        {
          provide: TradierService,
          useValue: mockTradierService,
        },
        {
          provide: MarketHoursService,
          useValue: mockMarketHoursService,
        },
        {
          provide: TaxLotService,
          useValue: mockTaxLotService,
        },
        {
          provide: OptionTaxService,
          useValue: mockOptionTaxService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: OrderAuditService,
          useValue: mockOrderAuditService,
        },
        {
          provide: OrderValidationService,
          useValue: mockOrderValidationService,
        },
        {
          provide: OrderQueryService,
          useValue: mockOrderQueryService,
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

      mockOrderQueryService.getOrders.mockResolvedValue(mockOrders);

      const result = await service.getOrders(mockUser.id!);

      expect(mockOrderQueryService.getOrders).toHaveBeenCalledWith(
        mockUser.id!,
        undefined,
      );
      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('should return empty array if no orders', async () => {
      mockOrderQueryService.getOrders.mockResolvedValue([]);

      const result = await service.getOrders(mockUser.id!);

      expect(result).toEqual([]);
    });
  });
});
