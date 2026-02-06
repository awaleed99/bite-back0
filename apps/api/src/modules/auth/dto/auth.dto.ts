import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
    Matches,
    IsPhoneNumber,
} from 'class-validator';

export class SignupDto {
    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(100)
    fullName: string;

    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(50)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        {
            message:
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        },
    )
    password: string;

    @ApiProperty({ example: '+201234567890' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+[1-9]\d{1,14}$/, {
        message: 'Phone must be in E.164 format (e.g., +201234567890)',
    })
    phone: string;
}

export class LoginDto {
    @ApiProperty({ example: 'john@example.com or +201234567890' })
    @IsString()
    @IsNotEmpty()
    emailOrPhone: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class VerifyPhoneDto {
    @ApiProperty({ example: '123456' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit code' })
    code: string;
}

export class ResendOtpDto {
    @ApiProperty({ example: 'john@example.com or +201234567890' })
    @IsString()
    @IsNotEmpty()
    emailOrPhone: string;
}

export class ForgotPasswordDto {
    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({ example: 'reset-token-uuid' })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ example: 'NewPassword123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(50)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        {
            message:
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        },
    )
    newPassword: string;
}

export class RefreshTokenDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class SocialLoginDto {
    @ApiProperty({ description: 'OAuth token from provider' })
    @IsString()
    @IsNotEmpty()
    token: string;
}
