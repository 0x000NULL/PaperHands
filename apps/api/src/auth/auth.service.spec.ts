import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenBlacklistService } from './services/token-blacklist.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockRefreshTokenRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let mockJwtService: { sign: jest.Mock; verify: jest.Mock };
  let mockCacheManager: { del: jest.Mock };
  let mockTokenBlacklistService: {
    blacklist: jest.Mock;
    revokeAllUserTokens: jest.Mock;
  };

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    cashBalance: 100000,
    onboardingCompleted: false,
    onboardingStep: 0,
    role: UserRole.USER,
    disabled: false,
  };

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockRefreshTokenRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    mockCacheManager = {
      del: jest.fn(),
    };

    mockTokenBlacklistService = {
      blacklist: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'Password123',
    };

    it('should register a new user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockRefreshTokenRepository.create.mockReturnValue({});
      mockRefreshTokenRepository.save.mockResolvedValue({});
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register(registerDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: registerDto.email,
        passwordHash: 'hashed-password',
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        cashBalance: mockUser.cashBalance,
        onboardingCompleted: mockUser.onboardingCompleted,
        onboardingStep: mockUser.onboardingStep,
        role: mockUser.role,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    it('should login successfully with valid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRefreshTokenRepository.create.mockReturnValue({});
      mockRefreshTokenRepository.save.mockResolvedValue({});
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        cashBalance: mockUser.cashBalance,
        onboardingCompleted: mockUser.onboardingCompleted,
        onboardingStep: mockUser.onboardingStep,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should blacklist token and clear user from cache', async () => {
      await service.logout('user-123', 'jti-123', 1234567890);

      expect(mockTokenBlacklistService.blacklist).toHaveBeenCalled();
      expect(
        mockTokenBlacklistService.revokeAllUserTokens,
      ).toHaveBeenCalledWith('user-123');
      expect(mockCacheManager.del).toHaveBeenCalledWith('user:user-123');
    });
  });
});
