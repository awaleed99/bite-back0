import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListRestaurantsDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RestaurantsService {
    constructor(private prisma: PrismaService) { }

    async findAll(dto: ListRestaurantsDto) {
        const {
            page = 1,
            limit = 10,
            categoryId,
            rating,
            maxDeliveryFee,
            minOrder,
            search,
            sortBy = 'rating',
            sortOrder = 'desc',
        } = dto;

        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.RestaurantWhereInput = {
            isActive: true,
            ...(categoryId && { categoryId }),
            ...(rating && { rating: { gte: rating } }),
            ...(maxDeliveryFee && { deliveryFee: { lte: maxDeliveryFee } }),
            ...(minOrder && { minOrderAmount: { lte: minOrder } }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { cuisineTypes: { has: search } },
                ],
            }),
        };

        // Build orderBy clause
        const orderBy: Prisma.RestaurantOrderByWithRelationInput = {};
        switch (sortBy) {
            case 'rating':
                orderBy.rating = sortOrder;
                break;
            case 'deliveryTime':
                orderBy.avgDeliveryTime = sortOrder;
                break;
            case 'deliveryFee':
                orderBy.deliveryFee = sortOrder;
                break;
            default:
                orderBy.rating = 'desc';
        }

        const [restaurants, total] = await Promise.all([
            this.prisma.restaurant.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    category: {
                        select: { id: true, name: true, slug: true },
                    },
                    _count: {
                        select: { orders: true },
                    },
                },
            }),
            this.prisma.restaurant.count({ where }),
        ]);

        return {
            items: restaurants.map((r) => ({
                id: r.id,
                name: r.name,
                slug: r.slug,
                description: r.description,
                logoUrl: r.logoUrl,
                coverImageUrl: r.coverImageUrl,
                category: r.category,
                cuisineTypes: r.cuisineTypes,
                rating: r.rating,
                reviewCount: r.reviewCount,
                deliveryFee: r.deliveryFee,
                minOrderAmount: r.minOrderAmount,
                avgDeliveryTime: r.avgDeliveryTime,
                isOpen: r.isOpen,
                orderCount: r._count.orders,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }

    async findOne(id: string) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id, isActive: true },
            include: {
                category: true,
                hours: {
                    orderBy: { dayOfWeek: 'asc' },
                },
                menuCategories: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        items: {
                            where: { isAvailable: true },
                            orderBy: { sortOrder: 'asc' },
                            include: {
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
                },
            },
        });

        if (!restaurant) {
            throw new NotFoundException('Restaurant not found');
        }

        return restaurant;
    }

    async findBySlug(slug: string) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { slug, isActive: true },
            include: {
                category: true,
                hours: {
                    orderBy: { dayOfWeek: 'asc' },
                },
                menuCategories: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        items: {
                            where: { isAvailable: true },
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                },
            },
        });

        if (!restaurant) {
            throw new NotFoundException('Restaurant not found');
        }

        return restaurant;
    }

    async getCategories() {
        return this.prisma.restaurantCategory.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
                _count: {
                    select: { restaurants: true },
                },
            },
        });
    }

    async getRecommended(limit: number = 10) {
        return this.prisma.restaurant.findMany({
            where: { isActive: true, isOpen: true },
            orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
            take: limit,
            include: {
                category: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });
    }
}
