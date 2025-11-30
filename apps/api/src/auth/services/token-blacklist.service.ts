import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class TokenBlacklistService {
  private readonly BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly USER_REVOKED_PREFIX = 'user:revoked:';

  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Add a token to the blacklist
   * @param jti JWT ID (unique token identifier)
   * @param expiresAt Token expiration time
   */
  async blacklist(jti: string, expiresAt: Date): Promise<void> {
    const ttl = Math.max(0, expiresAt.getTime() - Date.now());
    if (ttl > 0) {
      await this.cacheManager.set(`${this.BLACKLIST_PREFIX}${jti}`, '1', ttl);
    }
  }

  /**
   * Check if a token is blacklisted
   * @param jti JWT ID to check
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await this.cacheManager.get(
      `${this.BLACKLIST_PREFIX}${jti}`,
    );
    return result !== undefined && result !== null;
  }

  /**
   * Revoke all tokens for a user issued before now
   * Tokens issued before the revocation timestamp will be rejected
   * @param userId User ID to revoke tokens for
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // Store revocation timestamp - tokens issued before this time are invalid
    // TTL should be at least as long as the longest possible token lifetime
    const ttl = 15 * 60 * 1000 + 60000; // Access token TTL (15 min) + buffer
    await this.cacheManager.set(
      `${this.USER_REVOKED_PREFIX}${userId}`,
      Date.now().toString(),
      ttl,
    );
  }

  /**
   * Get the timestamp when all user tokens were revoked
   * @param userId User ID to check
   * @returns Revocation timestamp in ms, or null if not revoked
   */
  async getUserRevocationTime(userId: string): Promise<number | null> {
    const timestamp = await this.cacheManager.get<string>(
      `${this.USER_REVOKED_PREFIX}${userId}`,
    );
    return timestamp ? parseInt(timestamp, 10) : null;
  }
}
