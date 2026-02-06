import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MenuService {
    constructor(private prisma: PrismaService) { }

    async getRestaurantMenu(restaurantId: string) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId, isActive: true },
        });

        if (!restaurant) {
            throw new NotFoundException('Restaurant not found');
        }

        const categories = await this.prisma.menuCategory.findMany({
            where: { restaurantId, isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
                items: {
                    where: { isAvailable: true },
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        images: { orderBy: { sortOrder: 'asc' } },
                        addOnGroups: {
                            orderBy: { sortOrder: 'asc' },
                            include: {
                                options: {
                                    where: { isAvailable: true },
                                    orderBy: { sortOrder: 'asc' },
                                },
                            },
                        },
                    },
                },
            },
        });

        return {
            restaurantId,
            restaurantName: restaurant.name,
            categories,
        };
    }

    async getMenuItem(itemId: string) {
        const item = await this.prisma.menuItem.findUnique({
            where: { id: itemId, isAvailable: true },
            include: {
                category: {
                    include: {
                        restaurant: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                deliveryFee: true,
                                minOrderAmount: true,
                                avgDeliveryTime: true,
                            },
                        },
                    },
                },
                images: { orderBy: { sortOrder: 'asc' } },
                addOnGroups: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        options: {
                            where: { isAvailable: true },
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                },
            },
        });

        if (!item) {
            throw new NotFoundException('Menu item not found');
        }

        return item;
    }

    async getPopularItems(restaurantId?: string, limit: number = 10) {
        const where = {
            isAvailable: true,
            isPopular: true,
            ...(restaurantId && {
                category: { restaurantId },
            }),
        };

        return this.prisma.menuItem.findMany({
            where,
            take: limit,
            include: {
                category: {
                    include: {
                        restaurant: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        });
    }
}
