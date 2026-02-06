import { PrismaClient, Role, PaymentMethodType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Clean existing data
    await prisma.$transaction([
        prisma.orderItemAddOn.deleteMany(),
        prisma.orderItem.deleteMany(),
        prisma.paymentTransaction.deleteMany(),
        prisma.order.deleteMany(),
        prisma.cartItemAddOn.deleteMany(),
        prisma.cartItem.deleteMany(),
        prisma.cart.deleteMany(),
        prisma.addOnOption.deleteMany(),
        prisma.addOnGroup.deleteMany(),
        prisma.menuItemImage.deleteMany(),
        prisma.menuItem.deleteMany(),
        prisma.menuCategory.deleteMany(),
        prisma.restaurantHours.deleteMany(),
        prisma.restaurant.deleteMany(),
        prisma.restaurantCategory.deleteMany(),
        prisma.promotion.deleteMany(),
        prisma.searchHistory.deleteMany(),
        prisma.paymentMethod.deleteMany(),
        prisma.location.deleteMany(),
        prisma.notificationSettings.deleteMany(),
        prisma.passwordResetToken.deleteMany(),
        prisma.phoneVerificationOtp.deleteMany(),
        prisma.refreshToken.deleteMany(),
        prisma.user.deleteMany(),
    ]);

    console.log('📦 Creating users...');

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@biteback.com',
            phone: '+201000000000',
            passwordHash: adminPassword,
            fullName: 'Admin User',
            role: Role.ADMIN,
            isPhoneVerified: true,
            isEmailVerified: true,
        },
    });

    // Create restaurant owner
    const ownerPassword = await bcrypt.hash('Owner123!', 12);
    const owner = await prisma.user.create({
        data: {
            email: 'owner@restaurant.com',
            phone: '+201111111111',
            passwordHash: ownerPassword,
            fullName: 'Restaurant Owner',
            role: Role.RESTAURANT_OWNER,
            isPhoneVerified: true,
            isEmailVerified: true,
        },
    });

    // Create test user
    const userPassword = await bcrypt.hash('User123!', 12);
    const testUser = await prisma.user.create({
        data: {
            email: 'user@test.com',
            phone: '+201234567890',
            passwordHash: userPassword,
            fullName: 'Test User',
            role: Role.USER,
            isPhoneVerified: true,
            isEmailVerified: true,
        },
    });

    // Create notification settings for all users
    await prisma.notificationSettings.createMany({
        data: [
            { userId: admin.id },
            { userId: owner.id },
            { userId: testUser.id },
        ],
    });

    // Create payment method for test user
    await prisma.paymentMethod.create({
        data: {
            userId: testUser.id,
            type: PaymentMethodType.CREDIT_CARD,
            cardToken: 'tok_demo_visa_4242',
            lastFourDigits: '4242',
            cardBrand: 'Visa',
            expiryMonth: 12,
            expiryYear: 2025,
            isDefault: true,
        },
    });

    // Create location for test user
    const userLocation = await prisma.location.create({
        data: {
            userId: testUser.id,
            label: 'Home',
            address: '123 Main Street, Cairo, Egypt',
            building: 'Tower A',
            floor: '5',
            apartment: '502',
            landmark: 'Near the main mall',
            latitude: 30.0444,
            longitude: 31.2357,
            isDefault: true,
        },
    });

    console.log('🏪 Creating restaurant categories...');

    // Create restaurant categories
    const categories = await Promise.all([
        prisma.restaurantCategory.create({
            data: {
                name: 'Fast Food',
                slug: 'fast-food',
                description: 'Quick and delicious meals',
                sortOrder: 1,
            },
        }),
        prisma.restaurantCategory.create({
            data: {
                name: 'Pizza',
                slug: 'pizza',
                description: 'Italian pizza and more',
                sortOrder: 2,
            },
        }),
        prisma.restaurantCategory.create({
            data: {
                name: 'Asian',
                slug: 'asian',
                description: 'Asian cuisine and flavors',
                sortOrder: 3,
            },
        }),
        prisma.restaurantCategory.create({
            data: {
                name: 'Healthy',
                slug: 'healthy',
                description: 'Fresh and nutritious options',
                sortOrder: 4,
            },
        }),
        prisma.restaurantCategory.create({
            data: {
                name: 'Desserts',
                slug: 'desserts',
                description: 'Sweet treats and desserts',
                sortOrder: 5,
            },
        }),
    ]);

    console.log('🍔 Creating restaurants...');

    // Create restaurants
    const burgerKing = await prisma.restaurant.create({
        data: {
            ownerId: owner.id,
            name: 'Burger Palace',
            slug: 'burger-palace',
            description: 'The best burgers in town with premium ingredients',
            address: '456 Food Court, Cairo',
            categoryId: categories[0].id,
            cuisineTypes: ['American', 'Fast Food'],
            rating: 4.5,
            reviewCount: 234,
            deliveryFee: 25,
            minOrderAmount: 100,
            avgDeliveryTime: 30,
            isActive: true,
            isOpen: true,
        },
    });

    const pizzaHouse = await prisma.restaurant.create({
        data: {
            ownerId: owner.id,
            name: 'Pizza House',
            slug: 'pizza-house',
            description: 'Authentic Italian pizzas baked in wood-fired oven',
            address: '789 Italian Street, Cairo',
            categoryId: categories[1].id,
            cuisineTypes: ['Italian', 'Pizza'],
            rating: 4.7,
            reviewCount: 456,
            deliveryFee: 20,
            minOrderAmount: 150,
            avgDeliveryTime: 40,
            isActive: true,
            isOpen: true,
        },
    });

    const sushiMaster = await prisma.restaurant.create({
        data: {
            name: 'Sushi Master',
            slug: 'sushi-master',
            description: 'Fresh sushi and Japanese cuisine',
            address: '321 Japan Avenue, Cairo',
            categoryId: categories[2].id,
            cuisineTypes: ['Japanese', 'Sushi', 'Asian'],
            rating: 4.8,
            reviewCount: 189,
            deliveryFee: 35,
            minOrderAmount: 200,
            avgDeliveryTime: 45,
            isActive: true,
            isOpen: true,
        },
    });

    console.log('📋 Creating menu categories and items...');

    // Burger Palace Menu
    const burgerMainCategory = await prisma.menuCategory.create({
        data: {
            restaurantId: burgerKing.id,
            name: 'Burgers',
            description: 'Our signature burgers',
            sortOrder: 1,
        },
    });

    const burgerSidesCategory = await prisma.menuCategory.create({
        data: {
            restaurantId: burgerKing.id,
            name: 'Sides',
            description: 'Perfect accompaniments',
            sortOrder: 2,
        },
    });

    const burgerDrinksCategory = await prisma.menuCategory.create({
        data: {
            restaurantId: burgerKing.id,
            name: 'Drinks',
            description: 'Refreshing beverages',
            sortOrder: 3,
        },
    });

    // Burger items
    const classicBurger = await prisma.menuItem.create({
        data: {
            categoryId: burgerMainCategory.id,
            name: 'Classic Burger',
            description: 'Juicy beef patty with lettuce, tomato, and our special sauce',
            price: 85,
            isPopular: true,
            preparationTime: 15,
            sortOrder: 1,
        },
    });

    const cheeseBurger = await prisma.menuItem.create({
        data: {
            categoryId: burgerMainCategory.id,
            name: 'Double Cheese Burger',
            description: 'Two beef patties with melted cheddar cheese',
            price: 120,
            isPopular: true,
            preparationTime: 18,
            sortOrder: 2,
        },
    });

    const chickenBurger = await prisma.menuItem.create({
        data: {
            categoryId: burgerMainCategory.id,
            name: 'Crispy Chicken Burger',
            description: 'Crispy fried chicken with coleslaw',
            price: 95,
            preparationTime: 15,
            sortOrder: 3,
        },
    });

    const frenchFries = await prisma.menuItem.create({
        data: {
            categoryId: burgerSidesCategory.id,
            name: 'French Fries',
            description: 'Golden crispy fries',
            price: 30,
            isPopular: true,
            preparationTime: 10,
            sortOrder: 1,
        },
    });

    const onionRings = await prisma.menuItem.create({
        data: {
            categoryId: burgerSidesCategory.id,
            name: 'Onion Rings',
            description: 'Crispy battered onion rings',
            price: 35,
            preparationTime: 12,
            sortOrder: 2,
        },
    });

    const cola = await prisma.menuItem.create({
        data: {
            categoryId: burgerDrinksCategory.id,
            name: 'Cola',
            description: 'Ice cold cola',
            price: 15,
            preparationTime: 2,
            sortOrder: 1,
        },
    });

    // Add-on groups for burgers
    const sizeGroup = await prisma.addOnGroup.create({
        data: {
            menuItemId: classicBurger.id,
            name: 'Size',
            description: 'Choose your burger size',
            isRequired: true,
            minSelect: 1,
            maxSelect: 1,
            sortOrder: 1,
        },
    });

    await prisma.addOnOption.createMany({
        data: [
            { groupId: sizeGroup.id, name: 'Regular', price: 0, isDefault: true, sortOrder: 1 },
            { groupId: sizeGroup.id, name: 'Large', price: 25, sortOrder: 2 },
            { groupId: sizeGroup.id, name: 'Extra Large', price: 45, sortOrder: 3 },
        ],
    });

    const extrasGroup = await prisma.addOnGroup.create({
        data: {
            menuItemId: classicBurger.id,
            name: 'Extras',
            description: 'Add extra toppings',
            isRequired: false,
            minSelect: 0,
            maxSelect: 5,
            sortOrder: 2,
        },
    });

    await prisma.addOnOption.createMany({
        data: [
            { groupId: extrasGroup.id, name: 'Extra Cheese', price: 15, sortOrder: 1 },
            { groupId: extrasGroup.id, name: 'Bacon', price: 20, sortOrder: 2 },
            { groupId: extrasGroup.id, name: 'Jalapeños', price: 10, sortOrder: 3 },
            { groupId: extrasGroup.id, name: 'Fried Egg', price: 15, sortOrder: 4 },
            { groupId: extrasGroup.id, name: 'Avocado', price: 25, sortOrder: 5 },
        ],
    });

    // Pizza House Menu
    const pizzaCategory = await prisma.menuCategory.create({
        data: {
            restaurantId: pizzaHouse.id,
            name: 'Pizzas',
            description: 'Wood-fired pizzas',
            sortOrder: 1,
        },
    });

    const margherita = await prisma.menuItem.create({
        data: {
            categoryId: pizzaCategory.id,
            name: 'Margherita',
            description: 'Classic tomato, mozzarella, and basil',
            price: 120,
            isPopular: true,
            preparationTime: 20,
            sortOrder: 1,
        },
    });

    const pepperoni = await prisma.menuItem.create({
        data: {
            categoryId: pizzaCategory.id,
            name: 'Pepperoni',
            description: 'Loaded with pepperoni and cheese',
            price: 145,
            isPopular: true,
            preparationTime: 20,
            sortOrder: 2,
        },
    });

    const bbqChicken = await prisma.menuItem.create({
        data: {
            categoryId: pizzaCategory.id,
            name: 'BBQ Chicken',
            description: 'Grilled chicken with BBQ sauce',
            price: 155,
            preparationTime: 22,
            sortOrder: 3,
        },
    });

    // Pizza size add-on
    const pizzaSizeGroup = await prisma.addOnGroup.create({
        data: {
            menuItemId: margherita.id,
            name: 'Size',
            isRequired: true,
            minSelect: 1,
            maxSelect: 1,
            sortOrder: 1,
        },
    });

    await prisma.addOnOption.createMany({
        data: [
            { groupId: pizzaSizeGroup.id, name: 'Small (8")', price: 0, isDefault: true, sortOrder: 1 },
            { groupId: pizzaSizeGroup.id, name: 'Medium (10")', price: 30, sortOrder: 2 },
            { groupId: pizzaSizeGroup.id, name: 'Large (12")', price: 50, sortOrder: 3 },
            { groupId: pizzaSizeGroup.id, name: 'Family (14")', price: 80, sortOrder: 4 },
        ],
    });

    // Sushi Master Menu
    const sushiCategory = await prisma.menuCategory.create({
        data: {
            restaurantId: sushiMaster.id,
            name: 'Sushi Rolls',
            description: 'Fresh sushi rolls',
            sortOrder: 1,
        },
    });

    await prisma.menuItem.createMany({
        data: [
            {
                categoryId: sushiCategory.id,
                name: 'California Roll',
                description: 'Crab, avocado, and cucumber',
                price: 95,
                isPopular: true,
                preparationTime: 15,
                sortOrder: 1,
            },
            {
                categoryId: sushiCategory.id,
                name: 'Salmon Roll',
                description: 'Fresh salmon with cream cheese',
                price: 110,
                isPopular: true,
                preparationTime: 15,
                sortOrder: 2,
            },
            {
                categoryId: sushiCategory.id,
                name: 'Dragon Roll',
                description: 'Eel, avocado, and tobiko',
                price: 145,
                preparationTime: 18,
                sortOrder: 3,
            },
        ],
    });

    console.log('🎉 Creating promotions...');

    // Create promotions
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await prisma.promotion.createMany({
        data: [
            {
                restaurantId: burgerKing.id,
                title: 'First Order 20% Off',
                description: 'Get 20% off your first order at Burger Palace!',
                code: 'FIRST20',
                discountType: 'PERCENTAGE',
                discountValue: 20,
                minOrderAmount: 100,
                maxDiscount: 50,
                startDate: new Date(),
                endDate: nextMonth,
                isActive: true,
            },
            {
                restaurantId: pizzaHouse.id,
                title: 'Free Delivery Week',
                description: 'Free delivery on all orders this week!',
                code: 'FREEDEL',
                discountType: 'FIXED_AMOUNT',
                discountValue: 20,
                minOrderAmount: 150,
                startDate: new Date(),
                endDate: nextMonth,
                isActive: true,
            },
            {
                title: 'Summer Special',
                description: '15% off on all restaurants!',
                code: 'SUMMER15',
                discountType: 'PERCENTAGE',
                discountValue: 15,
                minOrderAmount: 100,
                maxDiscount: 75,
                startDate: new Date(),
                endDate: nextMonth,
                isActive: true,
            },
        ],
    });

    console.log('✅ Seed completed successfully!');
    console.log('');
    console.log('📧 Test Users:');
    console.log('  Admin: admin@biteback.com / Admin123!');
    console.log('  Owner: owner@restaurant.com / Owner123!');
    console.log('  User: user@test.com / User123!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
