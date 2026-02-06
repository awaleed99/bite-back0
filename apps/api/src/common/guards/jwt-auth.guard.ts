import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        private redisService: RedisService,
        private prismaService: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('Access token is required');
        }

        // Check if token is blacklisted
        const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            throw new UnauthorizedException('Token has been revoked');
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
                secret: this.configService.get('JWT_ACCESS_SECRET'),
            });

            if (payload.type !== 'access') {
                throw new UnauthorizedException('Invalid token type');
            }

            // Verify user still exists and is active
            const user = await this.prismaService.user.findUnique({
                where: { id: payload.sub },
                select: { id: true, email: true, role: true, isPhoneVerified: true },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // Attach user to request
            request['user'] = {
                id: user.id,
                email: user.email,
                role: user.role,
                isPhoneVerified: user.isPhoneVerified,
            };

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
