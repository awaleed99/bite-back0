import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { AddPaymentMethodDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller({ path: 'payment-methods', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    @ApiOperation({ summary: 'Add a new payment method' })
    @ApiResponse({ status: 201, description: 'Payment method added' })
    async addPaymentMethod(
        @CurrentUser() user: CurrentUserData,
        @Body() dto: AddPaymentMethodDto,
    ) {
        return this.paymentsService.addPaymentMethod(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all payment methods' })
    @ApiResponse({ status: 200, description: 'Payment methods retrieved' })
    async listPaymentMethods(@CurrentUser() user: CurrentUserData) {
        return this.paymentsService.listPaymentMethods(user.id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remove a payment method' })
    @ApiResponse({ status: 200, description: 'Payment method removed' })
    async removePaymentMethod(
        @CurrentUser() user: CurrentUserData,
        @Param('id') paymentMethodId: string,
    ) {
        return this.paymentsService.removePaymentMethod(user.id, paymentMethodId);
    }

    @Patch(':id/default')
    @ApiOperation({ summary: 'Set payment method as default' })
    @ApiResponse({ status: 200, description: 'Default payment method updated' })
    async setDefaultPaymentMethod(
        @CurrentUser() user: CurrentUserData,
        @Param('id') paymentMethodId: string,
    ) {
        return this.paymentsService.setDefaultPaymentMethod(user.id, paymentMethodId);
    }
}
