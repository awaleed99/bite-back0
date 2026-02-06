import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Menu')
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MenuController {
    constructor(private readonly menuService: MenuService) { }

    @Get('restaurants/:restaurantId/menu')
    @ApiOperation({ summary: 'Get restaurant menu with categories and items' })
    @ApiResponse({ status: 200, description: 'Menu retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Restaurant not found' })
    async getRestaurantMenu(@Param('restaurantId') restaurantId: string) {
        return this.menuService.getRestaurantMenu(restaurantId);
    }

    @Get('menu-items/:id')
    @ApiOperation({ summary: 'Get menu item details with add-ons' })
    @ApiResponse({ status: 200, description: 'Item retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Item not found' })
    async getMenuItem(@Param('id') id: string) {
        return this.menuService.getMenuItem(id);
    }

    @Get('menu-items/popular')
    @ApiOperation({ summary: 'Get popular menu items' })
    @ApiResponse({ status: 200, description: 'Popular items retrieved' })
    async getPopularItems(
        @Query('restaurantId') restaurantId?: string,
        @Query('limit') limit?: number,
    ) {
        return this.menuService.getPopularItems(restaurantId, limit);
    }
}
