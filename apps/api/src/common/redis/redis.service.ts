import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly client: Redis;
    private readonly logger = new Logger(RedisService.name);

    constructor(private configService: ConfigService) {
        this.client = new Redis({
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: this.configService.get('REDIS_PORT', 6379),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        this.client.on('connect', () => {
            this.logger.log('Redis connection established');
        });

        this.client.on('error', (error) => {
            this.logger.error('Redis connection error', error);
        });
    }

    async onModuleDestroy() {
        await this.client.quit();
        this.logger.log('Redis connection closed');
    }

    getClient(): Redis {
        return this.client;
    }

    // OTP Operations
    async setOtp(
        userId: string,
        code: string,
        expirationMinutes: number,
    ): Promise<void> {
        const key = `otp:${userId}`;
        await this.client.setex(key, expirationMinutes * 60, code);
    }

    async getOtp(userId: string): Promise<string | null> {
        return this.client.get(`otp:${userId}`);
    }

    async deleteOtp(userId: string): Promise<void> {
        await this.client.del(`otp:${userId}`);
    }

    // OTP Attempts tracking
    async incrementOtpAttempts(userId: string): Promise<number> {
        const key = `otp_attempts:${userId}`;
        const attempts = await this.client.incr(key);
        await this.client.expire(key, 300); // 5 minutes
        return attempts;
    }

    async getOtpAttempts(userId: string): Promise<number> {
        const attempts = await this.client.get(`otp_attempts:${userId}`);
        return attempts ? parseInt(attempts, 10) : 0;
    }

    async resetOtpAttempts(userId: string): Promise<void> {
        await this.client.del(`otp_attempts:${userId}`);
    }

    // OTP Resend cooldown
    async setResendCooldown(userId: string, seconds: number): Promise<void> {
        await this.client.setex(`otp_cooldown:${userId}`, seconds, '1');
    }

    async isInResendCooldown(userId: string): Promise<boolean> {
        const result = await this.client.get(`otp_cooldown:${userId}`);
        return result !== null;
    }

    async getCooldownTtl(userId: string): Promise<number> {
        return this.client.ttl(`otp_cooldown:${userId}`);
    }

    // Rate limiting
    async incrementRateLimit(
        key: string,
        windowSeconds: number,
    ): Promise<number> {
        const multi = this.client.multi();
        multi.incr(key);
        multi.expire(key, windowSeconds);
        const results = await multi.exec();
        return results ? (results[0][1] as number) : 1;
    }

    async getRateLimitCount(key: string): Promise<number> {
        const count = await this.client.get(key);
        return count ? parseInt(count, 10) : 0;
    }

    // Generic cache operations
    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.setex(key, ttlSeconds, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        const result = await this.client.exists(key);
        return result === 1;
    }

    // Blacklist tokens
    async blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
        await this.client.setex(`blacklist:${token}`, expiresInSeconds, '1');
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        const result = await this.client.get(`blacklist:${token}`);
        return result !== null;
    }
}
