import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { Position } from './entities/position.entity';
import { User } from '../users/entities/user.entity';
import { TradierService } from '../market-data/tradier.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let mockPositionRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let mockUserRepository: { findOne: jest.Mock };
  let mockTradierService: { getQuotes: jest.Mock };

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    cashBalance: 50000,
  };

  const mockPositions = [
    {
      id: 'pos-1',
      userId: 'user-123',
      symbol: 'AAPL',
      quantity: 10,
      avgCostBasis: 145,
    },
    {
      id: 'pos-2',
      userId: 'user-123',
      symbol: 'GOOGL',
      quantity: 5,
      avgCostBasis: 2700,
    },
  ];

  const mockQuotes = [
    {
      symbol: 'AAPL',
      last: 150,
      bid: 149.9,
      ask: 150.1,
    },
    {
      symbol: 'GOOGL',
      last: 2800,
      bid: 2799,
      ask: 2801,
    },
  ];

  beforeEach(async () => {
    mockPositionRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    mockUserRepository = {
      findOne: jest.fn(),
    };

    mockTradierService = {
      getQuotes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: getRepositoryToken(Position),
          useValue: mockPositionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: TradierService,
          useValue: mockTradierService,
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPortfolio', () => {
    it('should return portfolio with positions and values', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPositionRepository.find.mockResolvedValue(mockPositions);
      mockTradierService.getQuotes.mockResolvedValue(mockQuotes);

      const result = await service.getPortfolio(mockUser.id!);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockPositionRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
      expect(mockTradierService.getQuotes).toHaveBeenCalledWith([
        'AAPL',
        'GOOGL',
      ]);

      expect(result.cashBalance).toBe(50000);
      expect(result.positions).toHaveLength(2);

      // AAPL: 10 shares at $150 = $1,500 market value
      const aaplPosition = result.positions.find((p) => p.symbol === 'AAPL');
      expect(aaplPosition?.currentPrice).toBe(150);
      expect(aaplPosition?.marketValue).toBe(1500);
      expect(aaplPosition?.gainLoss).toBe(50); // (150 - 145) * 10

      // GOOGL: 5 shares at $2800 = $14,000 market value
      const googlPosition = result.positions.find((p) => p.symbol === 'GOOGL');
      expect(googlPosition?.currentPrice).toBe(2800);
      expect(googlPosition?.marketValue).toBe(14000);
      expect(googlPosition?.gainLoss).toBe(500); // (2800 - 2700) * 5

      // Total = cash + positions = 50000 + 1500 + 14000 = 65500
      expect(result.totalValue).toBe(65500);
    });

    it('should return portfolio with only cash if no positions', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPositionRepository.find.mockResolvedValue([]);

      const result = await service.getPortfolio(mockUser.id!);

      expect(result.cashBalance).toBe(50000);
      expect(result.positions).toEqual([]);
      expect(result.totalValue).toBe(50000);
      expect(mockTradierService.getQuotes).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getPortfolio('invalid-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findPosition', () => {
    it('should find an existing position', async () => {
      mockPositionRepository.findOne.mockResolvedValue(mockPositions[0]);

      const result = await service.findPosition('user-123', 'aapl');

      expect(mockPositionRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-123', symbol: 'AAPL' },
      });
      expect(result?.symbol).toBe('AAPL');
    });

    it('should return null if position not found', async () => {
      mockPositionRepository.findOne.mockResolvedValue(null);

      const result = await service.findPosition('user-123', 'TSLA');

      expect(result).toBeNull();
    });
  });

  describe('createOrUpdatePosition', () => {
    it('should create new position on buy if no existing position', async () => {
      mockPositionRepository.findOne.mockResolvedValue(null);
      mockPositionRepository.create.mockReturnValue({
        userId: 'user-123',
        symbol: 'TSLA',
        quantity: 10,
        avgCostBasis: 250,
      });

      await service.createOrUpdatePosition('user-123', 'tsla', 10, 250, true);

      expect(mockPositionRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        symbol: 'TSLA',
        quantity: 10,
        avgCostBasis: 250,
      });
      expect(mockPositionRepository.save).toHaveBeenCalled();
    });

    it('should update existing position on buy with weighted average', async () => {
      // Existing: 10 shares at $145 = $1450
      // Buying: 10 shares at $155 = $1550
      // New: 20 shares at ($1450 + $1550) / 20 = $150
      mockPositionRepository.findOne.mockResolvedValue(mockPositions[0]);

      await service.createOrUpdatePosition('user-123', 'AAPL', 10, 155, true);

      expect(mockPositionRepository.update).toHaveBeenCalledWith('pos-1', {
        quantity: 20,
        avgCostBasis: 150,
      });
    });

    it('should reduce quantity on sell', async () => {
      mockPositionRepository.findOne.mockResolvedValue(mockPositions[0]);

      await service.createOrUpdatePosition('user-123', 'AAPL', 5, 150, false);

      expect(mockPositionRepository.update).toHaveBeenCalledWith('pos-1', {
        quantity: 5,
      });
    });

    it('should remove position when selling all shares', async () => {
      mockPositionRepository.findOne.mockResolvedValue(mockPositions[0]);

      await service.createOrUpdatePosition('user-123', 'AAPL', 10, 150, false);

      expect(mockPositionRepository.remove).toHaveBeenCalledWith(
        mockPositions[0],
      );
    });
  });
});
