import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateNotificationSettingsDto } from './dto';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getNotificationSettings(userId: string) {
        let settings = await this.prisma.notificationSettings.findUnique({
            where: { userId },
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await this.prisma.notificationSettings.create({
                data: { userId },
            });
        }

        return settings;
    }

    async updateNotificationSettings(
        userId: string,
        dto: UpdateNotificationSettingsDto,
    ) {
        return this.prisma.notificationSettings.upsert({
            where: { userId },
            update: dto,
            create: {
                userId,
                ...dto,
            },
        });
    }
}
