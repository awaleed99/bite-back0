import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    pushNotifications?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    smsNotifications?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    promotionalEmails?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    orderUpdates?: boolean;
}
