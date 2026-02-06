import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';

@Injectable()
export class LocationsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, dto: CreateLocationDto) {
        // If this is the first location or marked as default, handle default logic
        if (dto.isDefault) {
            await this.prisma.location.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        // Check if this is the first location
        const existingCount = await this.prisma.location.count({ where: { userId } });

        return this.prisma.location.create({
            data: {
                userId,
                label: dto.label,
                address: dto.address,
                apartment: dto.apartment,
                floor: dto.floor,
                building: dto.building,
                landmark: dto.landmark,
                latitude: dto.latitude,
                longitude: dto.longitude,
                isDefault: dto.isDefault || existingCount === 0,
            },
        });
    }

    async findAll(userId: string) {
        return this.prisma.location.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }

    async findOne(userId: string, locationId: string) {
        const location = await this.prisma.location.findFirst({
            where: { id: locationId, userId },
        });

        if (!location) {
            throw new NotFoundException('Location not found');
        }

        return location;
    }

    async update(userId: string, locationId: string, dto: UpdateLocationDto) {
        const location = await this.prisma.location.findFirst({
            where: { id: locationId, userId },
        });

        if (!location) {
            throw new NotFoundException('Location not found');
        }

        if (dto.isDefault) {
            await this.prisma.location.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        return this.prisma.location.update({
            where: { id: locationId },
            data: dto,
        });
    }

    async remove(userId: string, locationId: string) {
        const location = await this.prisma.location.findFirst({
            where: { id: locationId, userId },
        });

        if (!location) {
            throw new NotFoundException('Location not found');
        }

        await this.prisma.location.delete({ where: { id: locationId } });

        // If this was the default, make another one default
        if (location.isDefault) {
            const another = await this.prisma.location.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });

            if (another) {
                await this.prisma.location.update({
                    where: { id: another.id },
                    data: { isDefault: true },
                });
            }
        }

        return { message: 'Location deleted successfully' };
    }

    async setDefault(userId: string, locationId: string) {
        const location = await this.prisma.location.findFirst({
            where: { id: locationId, userId },
        });

        if (!location) {
            throw new NotFoundException('Location not found');
        }

        await this.prisma.location.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });

        return this.prisma.location.update({
            where: { id: locationId },
            data: { isDefault: true },
        });
    }
}
