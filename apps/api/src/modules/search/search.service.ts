import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SearchDto } from './dto';

@Injectable()
export class SearchService {
    private readonly MAX_RECENT_SEARCHES = 10;

    constructor(private prisma: PrismaService) { }

    async search(userId: string, dto: SearchDto) {
        const { query, page = 1, limit = 10 } = dto;
        const skip = (page - 1) * limit;

        // Save search query (if has content)
        if (query && query.trim().length > 0) {
            await this.saveRecentSearch(userId, query.trim());
        }

        // Search restaurants
        const [restaurants, restaurantsTotal] = await Promise.all([
            this.prisma.restaurant.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                        { cuisineTypes: { has: query } },
                        { category: { name: { contains: query, mode: 'insensitive' } } },
                    ],
                },
                skip,
                take: limit,
                include: {
                    category: { select: { id: true, name: true } },
                },
            }),
            this.prisma.restaurant.count({
                where: {
                    isActive: true,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                        { cuisineTypes: { has: query } },
                    ],
                },
            }),
        ]);

        // Search menu items
        const [menuItems, menuItemsTotal] = await Promise.all([
            this.prisma.menuItem.findMany({
                where: {
                    isAvailable: true,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                },
                skip,
                take: limit,
                include: {
                    category: {
                        include: {
                            restaurant: {
                                select: { id: true, name: true, slug: true },
                            },
                        },
                    },
                },
            }),
            this.prisma.menuItem.count({
                where: {
                    isAvailable: true,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                },
            }),
        ]);

        return {
            query,
            restaurants: {
                items: restaurants,
                total: restaurantsTotal,
            },
            menuItems: {
                items: menuItems,
                total: menuItemsTotal,
            },
            pagination: {
                page,
                limit,
            },
        };
    }

    async getRecentSearches(userId: string) {
        const searches = await this.prisma.searchHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: this.MAX_RECENT_SEARCHES,
            select: {
                id: true,
                query: true,
                createdAt: true,
            },
        });

        // Return unique queries
        const uniqueQueries = [...new Map(searches.map((s) => [s.query, s])).values()];
        return uniqueQueries.slice(0, this.MAX_RECENT_SEARCHES);
    }

    async clearRecentSearches(userId: string) {
        await this.prisma.searchHistory.deleteMany({
            where: { userId },
        });

        return { message: 'Search history cleared' };
    }

    private async saveRecentSearch(userId: string, query: string) {
        // Check if this exact query already exists recently
        const existing = await this.prisma.searchHistory.findFirst({
            where: { userId, query },
            orderBy: { createdAt: 'desc' },
        });

        if (existing) {
            // Update timestamp
            await this.prisma.searchHistory.update({
                where: { id: existing.id },
                data: { createdAt: new Date() },
            });
        } else {
            // Create new
            await this.prisma.searchHistory.create({
                data: { userId, query },
            });

            // Clean up old searches (keep only last 10)
            const allSearches = await this.prisma.searchHistory.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                select: { id: true },
            });

            if (allSearches.length > this.MAX_RECENT_SEARCHES) {
                const idsToDelete = allSearches
                    .slice(this.MAX_RECENT_SEARCHES)
                    .map((s) => s.id);

                await this.prisma.searchHistory.deleteMany({
                    where: { id: { in: idsToDelete } },
                });
            }
        }
    }
}
