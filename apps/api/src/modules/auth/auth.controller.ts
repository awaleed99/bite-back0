import {
    Controller,
    Post,
    Body,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
    SignupDto,
    LoginDto,
    VerifyPhoneDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    RefreshTokenDto,
    ResendOtpDto,
    SocialLoginDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('signup')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 409, description: 'Email or phone already exists' })
    async signup(@Body() dto: SignupDto) {
        return this.authService.signup(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
    @ApiOperation({ summary: 'Login with email/phone and password' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('verify-phone')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @HttpCode(HttpStatus.OK)
    @Throttle({ short: { limit: 5, ttl: 300000 } }) // 5 attempts per 5 minutes
    @ApiOperation({ summary: 'Verify phone number with OTP' })
    @ApiResponse({ status: 200, description: 'Phone verified successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
    async verifyPhone(
        @Body() dto: VerifyPhoneDto,
        @CurrentUser() user: CurrentUserData,
    ) {
        return this.authService.verifyPhone(dto, user.id);
    }

    @Post('resend-otp')
    @HttpCode(HttpStatus.OK)
    @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
    @ApiOperation({ summary: 'Resend OTP code' })
    @ApiResponse({ status: 200, description: 'OTP sent successfully' })
    @ApiResponse({ status: 400, description: 'Cooldown period active' })
    async resendOtp(@Body() dto: ResendOtpDto) {
        return this.authService.resendOtp(dto);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
    @ApiOperation({ summary: 'Request password reset email' })
    @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refreshToken(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshToken(dto);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout user and revoke tokens' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    async logout(
        @CurrentUser() user: CurrentUserData,
        @Req() req: Request,
    ) {
        const token = req.headers.authorization?.split(' ')[1] || '';
        return this.authService.logout(user.id, token);
    }

    // Social login placeholders
    @Post('google')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with Google (placeholder)' })
    @ApiResponse({ status: 501, description: 'Not implemented' })
    async googleLogin(@Body() dto: SocialLoginDto) {
        return this.authService.googleLogin(dto.token);
    }

    @Post('facebook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with Facebook (placeholder)' })
    @ApiResponse({ status: 501, description: 'Not implemented' })
    async facebookLogin(@Body() dto: SocialLoginDto) {
        return this.authService.facebookLogin(dto.token);
    }
}
