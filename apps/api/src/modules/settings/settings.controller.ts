import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateNotificationSettingsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Settings')
@Controller({ path: 'settings', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get('notifications')
    @ApiOperation({ summary: 'Get notification settings' })
    @ApiResponse({ status: 200, description: 'Settings retrieved' })
    async getNotificationSettings(@CurrentUser() user: CurrentUserData) {
        return this.settingsService.getNotificationSettings(user.id);
    }

    @Patch('notifications')
    @ApiOperation({ summary: 'Update notification settings' })
    @ApiResponse({ status: 200, description: 'Settings updated' })
    async updateNotificationSettings(
        @CurrentUser() user: CurrentUserData,
        @Body() dto: UpdateNotificationSettingsDto,
    ) {
        return this.settingsService.updateNotificationSettings(user.id, dto);
    }
}
