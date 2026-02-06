import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsEmail,
    IsOptional,
    MinLength,
    MaxLength,
    Matches,
} from 'class-validator';

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'John Doe' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    fullName?: string;

    @ApiPropertyOptional({ example: 'john@example.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: '+201234567890' })
    @IsOptional()
    @IsString()
    @Matches(/^\+[1-9]\d{1,14}$/, {
        message: 'Phone must be in E.164 format',
    })
    phone?: string;

    @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
    @IsOptional()
    @IsString()
    avatarUrl?: string;
}

export class ChangePasswordDto {
    @ApiProperty({ example: 'CurrentPassword123!' })
    @IsString()
    currentPassword: string;

    @ApiProperty({ example: 'NewPassword123!' })
    @IsString()
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
