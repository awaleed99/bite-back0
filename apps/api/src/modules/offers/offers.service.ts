import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OffersService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        const now = new Date();

        return this.prisma.promotion.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            orderBy: { endDate: 'asc' },
            include: {
                restaurant: {
                    select: { id: true, name: true, logoUrl: true },
                },
            },
        });
    }

    async findOne(id: string) {
        return this.prisma.promotion.findUnique({
            where: { id },
            include: {
                restaurant: {
                    select: { id: true, name: true, logoUrl: true, slug: true },
                },
            },
        });
    }

    async findByCode(code: string) {
        const now = new Date();

        return this.prisma.promotion.findFirst({
            where: {
                code: code.toUpperCase(),
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            include: {
                restaurant: {
                    select: { id: true, name: true },
                },
            },
        });
    }
}
