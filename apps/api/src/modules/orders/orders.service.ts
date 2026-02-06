import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { CheckoutDto, ListOrdersDto, UpdateOrderStatusDto } from './dto';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdersService {
    constructor(
        private prisma: PrismaService,
        private cartService: CartService,
        private configService: ConfigService,
    ) { }

    async checkout(userId: string, dto: CheckoutDto) {
        // Get cart with full details
        const cart = await this.cartService.getCart(userId);

        if (!cart.items || cart.items.length === 0) {
            throw new BadRequestException('Cart is empty');
        }

        if (!cart.restaurant) {
            throw new BadRequestException('Restaurant not found in cart');
        }

        // Verify delivery location
        const location = await this.prisma.location.findFirst({
            where: { id: dto.deliveryLocationId, userId },
        });

        if (!location) {
            throw new NotFoundException('Delivery location not found');
        }

        // Verify payment method
        const paymentMethod = await this.prisma.paymentMethod.findFirst({
            where: { id: dto.paymentMethodId, userId },
        });

        if (!paymentMethod) {
            throw new NotFoundException('Payment method not found');
        }

        // Check minimum order amount
        const minOrder = Number(cart.restaurant.minOrderAmount);
        if (cart.subtotal < minOrder) {
            throw new BadRequestException(
                `Minimum order amount is ${minOrder}. Current subtotal: ${cart.subtotal}`,
            );
        }

        // Calculate pricing
        const subtotal = new Decimal(cart.subtotal);
        const deliveryFee = new Decimal(cart.restaurant.deliveryFee);
        const vatPercentage = new Decimal(
            this.configService.get<number>('VAT_PERCENTAGE', 14),
        );
        const vatAmount = subtotal.mul(vatPercentage).div(100);
        const total = subtotal.add(deliveryFee).add(vatAmount);

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Create order in a transaction
        const order = await this.prisma.$transaction(async (tx) => {
            // Create order
            const newOrder = await tx.order.create({
                data: {
                    orderNumber,
                    userId,
                    restaurantId: cart.restaurant!.id,
                    locationId: location.id,
                    subtotal,
                    deliveryFee,
                    vatAmount,
                    vatPercentage,
                    total,
                    status: OrderStatus.PENDING_PAYMENT,
                    paymentStatus: PaymentStatus.PENDING,
                    deliveryAddress: `${location.address}${location.building ? ', ' + location.building : ''}${location.floor ? ', Floor ' + location.floor : ''}${location.apartment ? ', Apt ' + location.apartment : ''}`,
                    deliveryInstructions: dto.deliveryInstructions,
                    estimatedDeliveryTime: new Date(
                        Date.now() + (cart.restaurant!.minOrderAmount ? 45 : 30) * 60 * 1000,
                    ),
                },
            });

            // Create order items
            for (const item of cart.items) {
                const orderItem = await tx.orderItem.create({
                    data: {
                        orderId: newOrder.id,
                        menuItemId: item.menuItem.id,
                        name: item.menuItem.name,
                        price: item.menuItem.discountPrice || item.menuItem.price,
                        quantity: item.quantity,
                        subtotal: new Decimal(item.lineTotal),
                        specialInstructions: item.specialInstructions,
                    },
                });

                // Create order item add-ons
                for (const addOn of item.addOns) {
                    await tx.orderItemAddOn.create({
                        data: {
                            orderItemId: orderItem.id,
                            addOnOptionId: addOn.addOnOption.id,
                            name: addOn.addOnOption.name,
                            price: addOn.addOnOption.price,
                            quantity: addOn.quantity,
                            subtotal: new Decimal(Number(addOn.addOnOption.price) * addOn.quantity),
                        },
                    });
                }
            }

            // Create mock payment transaction
            await tx.paymentTransaction.create({
                data: {
                    orderId: newOrder.id,
                    paymentMethodId: paymentMethod.id,
                    amount: total,
                    status: PaymentStatus.PAID, // Mock successful payment
                    transactionRef: `TXN-${Date.now()}`,
                    processedAt: new Date(),
                },
            });

            // Update order status to PLACED
            const updatedOrder = await tx.order.update({
                where: { id: newOrder.id },
                data: {
                    status: OrderStatus.PLACED,
                    paymentStatus: PaymentStatus.PAID,
                    placedAt: new Date(),
                },
                include: {
                    items: {
                        include: {
                            addOns: true,
                        },
                    },
                    restaurant: {
                        select: { id: true, name: true, logoUrl: true },
                    },
                    location: true,
                    transaction: true,
                },
            });

            // Clear cart
            await tx.cartItem.deleteMany({
                where: { cartId: cart.id },
            });

            return updatedOrder;
        });

        return {
            message: 'Order placed successfully',
            order,
        };
    }

    async findAll(userId: string, userRole: Role, dto: ListOrdersDto) {
        const { page = 1, limit = 10, status } = dto;
        const skip = (page - 1) * limit;

        // Build where clause based on role
        const where: any = {};

        if (userRole === Role.USER) {
            where.userId = userId;
        } else if (userRole === Role.RESTAURANT_OWNER) {
            // Get restaurants owned by this user
            const ownedRestaurants = await this.prisma.restaurant.findMany({
                where: { ownerId: userId },
                select: { id: true },
            });
            where.restaurantId = { in: ownedRestaurants.map((r) => r.id) };
        }
        // ADMIN can see all orders (no additional filter)

        if (status) {
            where.status = status;
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    restaurant: {
                        select: { id: true, name: true, logoUrl: true },
                    },
                    items: {
                        include: {
                            menuItem: {
                                select: { id: true, name: true, imageUrl: true },
                            },
                        },
                    },
                    _count: {
                        select: { items: true },
                    },
                },
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            items: orders,
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

    async findOne(userId: string, userRole: Role, orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: {
                    select: { id: true, fullName: true, phone: true, email: true },
                },
                restaurant: true,
                location: true,
                items: {
                    include: {
                        menuItem: true,
                        addOns: {
                            include: { addOnOption: true },
                        },
                    },
                },
                transaction: true,
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Check access
        if (userRole === Role.USER && order.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        if (userRole === Role.RESTAURANT_OWNER) {
            const restaurant = await this.prisma.restaurant.findUnique({
                where: { id: order.restaurantId },
            });
            if (restaurant?.ownerId !== userId) {
                throw new ForbiddenException('Access denied');
            }
        }

        return order;
    }

    async updateStatus(
        userId: string,
        userRole: Role,
        orderId: string,
        dto: UpdateOrderStatusDto,
    ) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { restaurant: true },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Check permissions
        if (userRole === Role.USER) {
            // Users can only cancel their own orders if status is PLACED
            if (order.userId !== userId) {
                throw new ForbiddenException('Access denied');
            }
            if (dto.status !== OrderStatus.CANCELLED) {
                throw new ForbiddenException('Users can only cancel orders');
            }
            if (order.status !== OrderStatus.PLACED) {
                throw new BadRequestException('Order cannot be cancelled at this stage');
            }
        }

        if (userRole === Role.RESTAURANT_OWNER) {
            if (order.restaurant.ownerId !== userId) {
                throw new ForbiddenException('Access denied');
            }
        }

        // Update timestamps based on status
        const updateData: any = { status: dto.status };

        switch (dto.status) {
            case OrderStatus.CONFIRMED:
                updateData.confirmedAt = new Date();
                break;
            case OrderStatus.PREPARING:
                updateData.preparingAt = new Date();
                break;
            case OrderStatus.OUT_FOR_DELIVERY:
                updateData.outForDeliveryAt = new Date();
                break;
            case OrderStatus.DELIVERED:
                updateData.deliveredAt = new Date();
                updateData.actualDeliveryTime = new Date();
                break;
            case OrderStatus.CANCELLED:
                updateData.cancelledAt = new Date();
                updateData.cancellationReason = dto.reason;
                break;
        }

        return this.prisma.order.update({
            where: { id: orderId },
            data: updateData,
            include: {
                restaurant: {
                    select: { id: true, name: true },
                },
                items: true,
            },
        });
    }
}
