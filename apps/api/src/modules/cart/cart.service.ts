import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto } from './dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CartService {
    constructor(private prisma: PrismaService) { }

    async getCart(userId: string) {
        let cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        menuItem: {
                            include: {
                                category: {
                                    include: {
                                        restaurant: {
                                            select: {
                                                id: true,
                                                name: true,
                                                deliveryFee: true,
                                                minOrderAmount: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        addOns: {
                            include: {
                                addOnOption: true,
                            },
                        },
                    },
                },
            },
        });

        // Create cart if doesn't exist
        if (!cart) {
            cart = await this.prisma.cart.create({
                data: { userId },
                include: {
                    items: {
                        include: {
                            menuItem: {
                                include: {
                                    category: {
                                        include: {
                                            restaurant: {
                                                select: {
                                                    id: true,
                                                    name: true,
                                                    deliveryFee: true,
                                                    minOrderAmount: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            addOns: {
                                include: {
                                    addOnOption: true,
                                },
                            },
                        },
                    },
                },
            });
        }

        // Calculate totals
        const itemsWithTotals = cart.items.map((item) => {
            const itemPrice = item.menuItem.discountPrice || item.menuItem.price;
            const addOnsTotal = item.addOns.reduce((sum, addOn) => {
                return sum + Number(addOn.addOnOption.price) * addOn.quantity;
            }, 0);
            const lineTotal = (Number(itemPrice) + addOnsTotal) * item.quantity;

            return {
                ...item,
                unitPrice: itemPrice,
                addOnsTotal,
                lineTotal,
            };
        });

        const subtotal = itemsWithTotals.reduce(
            (sum, item) => sum + item.lineTotal,
            0,
        );

        // Get restaurant info from first item (cart should only have items from one restaurant)
        const restaurant = itemsWithTotals[0]?.menuItem.category.restaurant;

        return {
            id: cart.id,
            userId: cart.userId,
            items: itemsWithTotals,
            restaurant,
            subtotal,
            itemCount: itemsWithTotals.length,
            totalQuantity: itemsWithTotals.reduce((sum, item) => sum + item.quantity, 0),
        };
    }

    async addItem(userId: string, dto: AddToCartDto) {
        // Verify menu item exists
        const menuItem = await this.prisma.menuItem.findUnique({
            where: { id: dto.menuItemId, isAvailable: true },
            include: {
                category: {
                    include: { restaurant: true },
                },
                addOnGroups: {
                    include: { options: true },
                },
            },
        });

        if (!menuItem) {
            throw new NotFoundException('Menu item not found or unavailable');
        }

        // Get or create cart
        let cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        menuItem: {
                            include: { category: true },
                        },
                    },
                },
            },
        });

        if (!cart) {
            cart = await this.prisma.cart.create({
                data: { userId },
                include: {
                    items: {
                        include: {
                            menuItem: {
                                include: { category: true },
                            },
                        },
                    },
                },
            });
        }

        // Check if cart has items from a different restaurant
        if (cart.items.length > 0) {
            const existingRestaurantId = cart.items[0].menuItem.category.restaurantId;
            if (existingRestaurantId !== menuItem.category.restaurantId) {
                throw new BadRequestException(
                    'Cart contains items from a different restaurant. Clear cart first.',
                );
            }
        }

        // Validate add-ons if provided
        if (dto.addOns && dto.addOns.length > 0) {
            for (const addOn of dto.addOns) {
                const option = await this.prisma.addOnOption.findUnique({
                    where: { id: addOn.addOnOptionId, isAvailable: true },
                    include: { group: true },
                });

                if (!option) {
                    throw new BadRequestException(
                        `Add-on option ${addOn.addOnOptionId} not found or unavailable`,
                    );
                }

                if (option.group.menuItemId !== dto.menuItemId) {
                    throw new BadRequestException(
                        `Add-on option ${addOn.addOnOptionId} does not belong to this menu item`,
                    );
                }
            }
        }

        // Create cart item
        const cartItem = await this.prisma.cartItem.create({
            data: {
                cartId: cart.id,
                menuItemId: dto.menuItemId,
                quantity: dto.quantity,
                specialInstructions: dto.specialInstructions,
                addOns: dto.addOns
                    ? {
                        create: dto.addOns.map((addOn) => ({
                            addOnOptionId: addOn.addOnOptionId,
                            quantity: addOn.quantity,
                        })),
                    }
                    : undefined,
            },
            include: {
                menuItem: true,
                addOns: {
                    include: { addOnOption: true },
                },
            },
        });

        return cartItem;
    }

    async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
        // Verify cart item belongs to user
        const cartItem = await this.prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cart: { userId },
            },
        });

        if (!cartItem) {
            throw new NotFoundException('Cart item not found');
        }

        // Update cart item
        return this.prisma.cartItem.update({
            where: { id: itemId },
            data: {
                ...(dto.quantity !== undefined && { quantity: dto.quantity }),
                ...(dto.specialInstructions !== undefined && {
                    specialInstructions: dto.specialInstructions,
                }),
            },
            include: {
                menuItem: true,
                addOns: {
                    include: { addOnOption: true },
                },
            },
        });
    }

    async removeItem(userId: string, itemId: string) {
        // Verify cart item belongs to user
        const cartItem = await this.prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cart: { userId },
            },
        });

        if (!cartItem) {
            throw new NotFoundException('Cart item not found');
        }

        await this.prisma.cartItem.delete({
            where: { id: itemId },
        });

        return { message: 'Item removed from cart' };
    }

    async clearCart(userId: string) {
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
        });

        if (!cart) {
            return { message: 'Cart is already empty' };
        }

        await this.prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
        });

        return { message: 'Cart cleared successfully' };
    }
}
