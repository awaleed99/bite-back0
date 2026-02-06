import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'info' },
                { emit: 'stdout', level: 'warn' },
                { emit: 'stdout', level: 'error' },
            ],
        });
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('Database connection established');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Database connection closed');
    }

    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('cleanDatabase is not allowed in production');
        }

        // Delete in order respecting foreign key constraints
        await this.$transaction([
            this.orderItemAddOn.deleteMany(),
            this.orderItem.deleteMany(),
            this.paymentTransaction.deleteMany(),
            this.order.deleteMany(),
            this.cartItemAddOn.deleteMany(),
            this.cartItem.deleteMany(),
            this.cart.deleteMany(),
            this.addOnOption.deleteMany(),
            this.addOnGroup.deleteMany(),
            this.menuItemImage.deleteMany(),
            this.menuItem.deleteMany(),
            this.menuCategory.deleteMany(),
            this.restaurantHours.deleteMany(),
            this.restaurant.deleteMany(),
            this.restaurantCategory.deleteMany(),
            this.promotion.deleteMany(),
            this.searchHistory.deleteMany(),
            this.paymentMethod.deleteMany(),
            this.location.deleteMany(),
            this.notificationSettings.deleteMany(),
            this.passwordResetToken.deleteMany(),
            this.phoneVerificationOtp.deleteMany(),
            this.refreshToken.deleteMany(),
            this.user.deleteMany(),
        ]);
    }
}
