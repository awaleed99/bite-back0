import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
    SignupDto,
    LoginDto,
    VerifyPhoneDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    RefreshTokenDto,
    ResendOtpDto,
} from './dto';
import { JwtPayload } from '../../common/guards/jwt-auth.guard';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private redisService: RedisService,
    ) { }

    async signup(dto: SignupDto) {
        // Check if email already exists
        const existingEmail = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (existingEmail) {
            throw new ConflictException('Email already registered');
        }

        // Check if phone already exists
        const existingPhone = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });
        if (existingPhone) {
            throw new ConflictException('Phone number already registered');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, 12);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                phone: dto.phone,
                passwordHash,
                fullName: dto.fullName,
            },
            select: {
                id: true,
                email: true,
                phone: true,
                fullName: true,
                role: true,
                isPhoneVerified: true,
                createdAt: true,
            },
        });

        // Create default notification settings
        await this.prisma.notificationSettings.create({
            data: { userId: user.id },
        });

        // Generate and send OTP
        await this.generateAndSendOtp(user.id, user.phone);

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role);

        return {
            user,
            ...tokens,
            message: 'Signup successful. Please verify your phone number.',
        };
    }

    async login(dto: LoginDto) {
        // Find user by email or phone
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.emailOrPhone.toLowerCase() },
                    { phone: dto.emailOrPhone },
                ],
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role);

        return {
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                fullName: user.fullName,
                role: user.role,
                isPhoneVerified: user.isPhoneVerified,
            },
            ...tokens,
        };
    }

    async verifyPhone(dto: VerifyPhoneDto, userId: string) {
        // Check attempt limit
        const attempts = await this.redisService.getOtpAttempts(userId);
        const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);

        if (attempts >= maxAttempts) {
            throw new BadRequestException(
                'Too many failed attempts. Please request a new OTP.',
            );
        }

        // Get stored OTP from Redis
        const storedOtp = await this.redisService.getOtp(userId);
        if (!storedOtp) {
            throw new BadRequestException('OTP expired or not found. Please request a new one.');
        }

        // Verify OTP
        if (storedOtp !== dto.code) {
            await this.redisService.incrementOtpAttempts(userId);
            throw new BadRequestException('Invalid OTP code');
        }

        // Update user phone verification status
        await this.prisma.user.update({
            where: { id: userId },
            data: { isPhoneVerified: true },
        });

        // Clean up Redis
        await this.redisService.deleteOtp(userId);
        await this.redisService.resetOtpAttempts(userId);

        return { message: 'Phone verified successfully' };
    }

    async resendOtp(dto: ResendOtpDto) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [{ email: dto.emailOrPhone }, { phone: dto.emailOrPhone }],
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check cooldown
        const isInCooldown = await this.redisService.isInResendCooldown(user.id);
        if (isInCooldown) {
            const ttl = await this.redisService.getCooldownTtl(user.id);
            throw new BadRequestException(
                `Please wait ${ttl} seconds before requesting a new OTP`,
            );
        }

        // Generate and send OTP
        await this.generateAndSendOtp(user.id, user.phone);

        return { message: 'OTP sent successfully' };
    }

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        // Always return success to prevent email enumeration
        if (!user) {
            return { message: 'If an account exists, a password reset link has been sent' };
        }

        // Generate reset token
        const resetToken = uuidv4();
        const expirationMinutes = this.configService.get<number>(
            'PASSWORD_RESET_EXPIRATION_MINUTES',
            30,
        );

        // Store reset token
        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: resetToken,
                expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
            },
        });

        // In production, send email with reset link
        // For now, log the token
        const frontendUrl = this.configService.get('FRONTEND_URL');
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
        this.logger.log(`Password reset link: ${resetLink}`);

        return {
            message: 'If an account exists, a password reset link has been sent',
            // Only include token in development for testing
            ...(process.env.NODE_ENV !== 'production' && { resetToken }),
        };
    }

    async resetPassword(dto: ResetPasswordDto) {
        // Find valid reset token
        const resetToken = await this.prisma.passwordResetToken.findFirst({
            where: {
                token: dto.token,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });

        if (!resetToken) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(dto.newPassword, 12);

        // Update password and mark token as used
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { usedAt: new Date() },
            }),
            // Revoke all existing refresh tokens for security
            this.prisma.refreshToken.updateMany({
                where: { userId: resetToken.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
        ]);

        return { message: 'Password reset successfully' };
    }

    async refreshToken(dto: RefreshTokenDto) {
        try {
            // Verify refresh token
            const payload = await this.jwtService.verifyAsync<JwtPayload>(
                dto.refreshToken,
                { secret: this.configService.get('JWT_REFRESH_SECRET') },
            );

            if (payload.type !== 'refresh') {
                throw new UnauthorizedException('Invalid token type');
            }

            // Find the stored refresh token
            const storedToken = await this.prisma.refreshToken.findFirst({
                where: {
                    token: dto.refreshToken,
                    userId: payload.sub,
                    revokedAt: null,
                    expiresAt: { gt: new Date() },
                },
                include: { user: true },
            });

            if (!storedToken) {
                throw new UnauthorizedException('Invalid or expired refresh token');
            }

            // Rotate refresh token - revoke old one
            await this.prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { revokedAt: new Date() },
            });

            // Generate new tokens
            const tokens = await this.generateTokens(
                storedToken.user.id,
                storedToken.user.email,
                storedToken.user.role,
            );

            // Link old token to new one for audit
            await this.prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { replacedByToken: tokens.refreshToken },
            });

            return tokens;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    async logout(userId: string, accessToken: string) {
        // Revoke all refresh tokens for this user
        await this.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });

        // Blacklist the current access token
        // Get token expiration from JWT
        const decoded = this.jwtService.decode(accessToken) as JwtPayload;
        if (decoded?.exp) {
            const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
            if (expiresIn > 0) {
                await this.redisService.blacklistToken(accessToken, expiresIn);
            }
        }

        return { message: 'Logged out successfully' };
    }

    // Social login placeholders
    async googleLogin(token: string) {
        // TODO: Implement Google OAuth verification
        throw new BadRequestException('Google login not yet implemented');
    }

    async facebookLogin(token: string) {
        // TODO: Implement Facebook OAuth verification
        throw new BadRequestException('Facebook login not yet implemented');
    }

    // Helper methods
    private async generateTokens(userId: string, email: string, role: string) {
        const accessPayload: JwtPayload = {
            sub: userId,
            email,
            role,
            type: 'access',
        };

        const refreshPayload: JwtPayload = {
            sub: userId,
            email,
            role,
            type: 'refresh',
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(accessPayload, {
                secret: this.configService.get('JWT_ACCESS_SECRET'),
                expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
            }),
            this.jwtService.signAsync(refreshPayload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
            }),
        ]);

        // Store refresh token in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await this.prisma.refreshToken.create({
            data: {
                userId,
                token: refreshToken,
                expiresAt,
            },
        });

        return { accessToken, refreshToken };
    }

    private async generateAndSendOtp(userId: string, phone: string) {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store in Redis with expiration
        const expirationMinutes = this.configService.get<number>(
            'OTP_EXPIRATION_MINUTES',
            5,
        );
        await this.redisService.setOtp(userId, otp, expirationMinutes);

        // Set resend cooldown
        const cooldownSeconds = this.configService.get<number>(
            'OTP_RESEND_COOLDOWN_SECONDS',
            60,
        );
        await this.redisService.setResendCooldown(userId, cooldownSeconds);

        // In production, send SMS
        // For now, log the OTP
        this.logger.log(`OTP for ${phone}: ${otp}`);

        // Return OTP in development for testing
        return process.env.NODE_ENV !== 'production' ? otp : undefined;
    }
}
