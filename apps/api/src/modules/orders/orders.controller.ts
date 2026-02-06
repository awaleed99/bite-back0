import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto, ListOrdersDto, UpdateOrderStatusDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Orders')
@Controller({ path: 'orders', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post('checkout')
    @ApiOperation({ summary: 'Create order from cart (checkout)' })
    @ApiResponse({ status: 201, description: 'Order placed successfully' })
    @ApiResponse({ status: 400, description: 'Cart empty or validation error' })
    async checkout(
        @CurrentUser() user: CurrentUserData,
        @Body() dto: CheckoutDto,
    ) {
        return this.ordersService.checkout(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List user orders (or all for admin/owner)' })
    @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
    async findAll(
        @CurrentUser() user: CurrentUserData,
        @Query() query: ListOrdersDto,
    ) {
        return this.ordersService.findAll(user.id, user.role as Role, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order details' })
    @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findOne(
        @CurrentUser() user: CurrentUserData,
        @Param('id') orderId: string,
    ) {
        return this.ordersService.findOne(user.id, user.role as Role, orderId);
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.RESTAURANT_OWNER, Role.USER)
    @ApiOperation({ summary: 'Update order status' })
    @ApiResponse({ status: 200, description: 'Order status updated' })
    @ApiResponse({ status: 403, description: 'Access denied' })
    async updateStatus(
        @CurrentUser() user: CurrentUserData,
        @Param('id') orderId: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.ordersService.updateStatus(user.id, user.role as Role, orderId, dto);
    }
}
