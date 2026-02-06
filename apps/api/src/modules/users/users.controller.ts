import {
    Controller,
    Get,
    Patch,
    Post,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller({ path: 'profile', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    async getProfile(@CurrentUser() user: CurrentUserData) {
        return this.usersService.getProfile(user.id);
    }

    @Patch()
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    async updateProfile(
        @CurrentUser() user: CurrentUserData,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(user.id, dto);
    }

    @Post('change-password')
    @ApiOperation({ summary: 'Change user password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    @ApiResponse({ status: 400, description: 'Current password is incorrect' })
    async changePassword(
        @CurrentUser() user: CurrentUserData,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(user.id, dto);
    }
}
