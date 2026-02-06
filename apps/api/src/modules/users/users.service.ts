import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                phone: true,
                fullName: true,
                role: true,
                avatarUrl: true,
                isPhoneVerified: true,
                isEmailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        // Check if email is being changed and if it's already in use
        if (dto.email) {
            const existingUser = await this.prisma.user.findFirst({
                where: {
                    email: dto.email.toLowerCase(),
                    NOT: { id: userId },
                },
            });
            if (existingUser) {
                throw new BadRequestException('Email already in use');
            }
        }

        // Check if phone is being changed and if it's already in use
        if (dto.phone) {
            const existingUser = await this.prisma.user.findFirst({
                where: {
                    phone: dto.phone,
                    NOT: { id: userId },
                },
            });
            if (existingUser) {
                throw new BadRequestException('Phone number already in use');
            }
        }

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.fullName && { fullName: dto.fullName }),
                ...(dto.email && { email: dto.email.toLowerCase(), isEmailVerified: false }),
                ...(dto.phone && { phone: dto.phone, isPhoneVerified: false }),
                ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
            },
            select: {
                id: true,
                email: true,
                phone: true,
                fullName: true,
                role: true,
                avatarUrl: true,
                isPhoneVerified: true,
                isEmailVerified: true,
                updatedAt: true,
            },
        });

        return user;
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(dto.newPassword, 12);

        // Update password
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });

        return { message: 'Password changed successfully' };
    }
}
