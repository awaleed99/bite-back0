import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Cart')
@Controller({ path: 'cart', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CartController {
    constructor(private readonly cartService: CartService) { }

    @Get()
    @ApiOperation({ summary: 'Get current user cart' })
    @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
    async getCart(@CurrentUser() user: CurrentUserData) {
        return this.cartService.getCart(user.id);
    }

    @Post('items')
    @ApiOperation({ summary: 'Add item to cart' })
    @ApiResponse({ status: 201, description: 'Item added to cart' })
    @ApiResponse({ status: 400, description: 'Invalid item or cart conflict' })
    async addItem(
        @CurrentUser() user: CurrentUserData,
        @Body() dto: AddToCartDto,
    ) {
        return this.cartService.addItem(user.id, dto);
    }

    @Patch('items/:id')
    @ApiOperation({ summary: 'Update cart item quantity' })
    @ApiResponse({ status: 200, description: 'Item updated successfully' })
    @ApiResponse({ status: 404, description: 'Item not found' })
    async updateItem(
        @CurrentUser() user: CurrentUserData,
        @Param('id') itemId: string,
        @Body() dto: UpdateCartItemDto,
    ) {
        return this.cartService.updateItem(user.id, itemId, dto);
    }

    @Delete('items/:id')
    @ApiOperation({ summary: 'Remove item from cart' })
    @ApiResponse({ status: 200, description: 'Item removed successfully' })
    @ApiResponse({ status: 404, description: 'Item not found' })
    async removeItem(
        @CurrentUser() user: CurrentUserData,
        @Param('id') itemId: string,
    ) {
        return this.cartService.removeItem(user.id, itemId);
    }

    @Delete()
    @ApiOperation({ summary: 'Clear entire cart' })
    @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
    async clearCart(@CurrentUser() user: CurrentUserData) {
        return this.cartService.clearCart(user.id);
    }
}
