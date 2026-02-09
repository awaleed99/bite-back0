import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

// Common modules
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './common/health/health.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { MenuModule } from './modules/menu/menu.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LocationsModule } from './modules/locations/locations.module';
import { SearchModule } from './modules/search/search.module';
import { OffersModule } from './modules/offers/offers.module';
import { SettingsModule } from './modules/settings/settings.module';

// Guards
import { RolesGuard } from './common/guards/roles.guard';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Rate limiting
        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 1000, // 1 second
                limit: 3,
            },
            {
                name: 'medium',
                ttl: 10000, // 10 seconds
                limit: 20,
            },
            {
                name: 'long',
                ttl: 60000, // 1 minute
                limit: 100,
            },
        ]),

        // Common modules
        PrismaModule,
        RedisModule,
        HealthModule,

        // Feature modules
        AuthModule,
        UsersModule,
        RestaurantsModule,
        MenuModule,
        CartModule,
        OrdersModule,
        PaymentsModule,
        LocationsModule,
        SearchModule,
        OffersModule,
        SettingsModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        RolesGuard,
    ],
})
export class AppModule { }
