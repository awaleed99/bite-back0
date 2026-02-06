import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddPaymentMethodDto } from './dto';
import { PaymentMethodType } from '@prisma/client';

@Injectable()
export class PaymentsService {
    constructor(private prisma: PrismaService) { }

    async addPaymentMethod(userId: string, dto: AddPaymentMethodDto) {
        // Mock tokenization - in production, this would come from a payment gateway
        const cardToken = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Check if this is the first payment method (make it default)
        const existingMethods = await this.prisma.paymentMethod.count({
            where: { userId },
        });

        const paymentMethod = await this.prisma.paymentMethod.create({
            data: {
                userId,
                type: dto.type,
                cardToken,
                lastFourDigits: dto.cardNumber.slice(-4),
                cardBrand: this.detectCardBrand(dto.cardNumber),
                expiryMonth: dto.expiryMonth,
                expiryYear: dto.expiryYear,
                isDefault: existingMethods === 0,
            },
            select: {
                id: true,
                type: true,
                lastFourDigits: true,
                cardBrand: true,
                expiryMonth: true,
                expiryYear: true,
                isDefault: true,
                createdAt: true,
            },
        });

        return paymentMethod;
    }

    async listPaymentMethods(userId: string) {
        return this.prisma.paymentMethod.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
            select: {
                id: true,
                type: true,
                lastFourDigits: true,
                cardBrand: true,
                expiryMonth: true,
                expiryYear: true,
                isDefault: true,
                createdAt: true,
            },
        });
    }

    async removePaymentMethod(userId: string, paymentMethodId: string) {
        const paymentMethod = await this.prisma.paymentMethod.findFirst({
            where: { id: paymentMethodId, userId },
        });

        if (!paymentMethod) {
            throw new NotFoundException('Payment method not found');
        }

        // Check if there are pending orders using this payment method
        const pendingOrders = await this.prisma.paymentTransaction.findFirst({
            where: {
                paymentMethodId,
                status: 'PENDING',
            },
        });

        if (pendingOrders) {
            throw new BadRequestException(
                'Cannot delete payment method with pending transactions',
            );
        }

        await this.prisma.paymentMethod.delete({
            where: { id: paymentMethodId },
        });

        // If this was the default, make another one default
        if (paymentMethod.isDefault) {
            const anotherMethod = await this.prisma.paymentMethod.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });

            if (anotherMethod) {
                await this.prisma.paymentMethod.update({
                    where: { id: anotherMethod.id },
                    data: { isDefault: true },
                });
            }
        }

        return { message: 'Payment method removed successfully' };
    }

    async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
        const paymentMethod = await this.prisma.paymentMethod.findFirst({
            where: { id: paymentMethodId, userId },
        });

        if (!paymentMethod) {
            throw new NotFoundException('Payment method not found');
        }

        // Remove default from all other methods
        await this.prisma.paymentMethod.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });

        // Set this one as default
        return this.prisma.paymentMethod.update({
            where: { id: paymentMethodId },
            data: { isDefault: true },
            select: {
                id: true,
                type: true,
                lastFourDigits: true,
                cardBrand: true,
                isDefault: true,
            },
        });
    }

    private detectCardBrand(cardNumber: string): string {
        const cleanNumber = cardNumber.replace(/\s/g, '');

        if (/^4/.test(cleanNumber)) return 'Visa';
        if (/^5[1-5]/.test(cleanNumber)) return 'Mastercard';
        if (/^3[47]/.test(cleanNumber)) return 'Amex';
        if (/^6(?:011|5)/.test(cleanNumber)) return 'Discover';

        return 'Unknown';
    }
}
