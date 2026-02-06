import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const logger = new Logger('Bootstrap');

    // Global prefix
    app.setGlobalPrefix('api');

    // API versioning
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    // CORS
    app.enableCors({
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Global response transformer
    app.useGlobalInterceptors(new TransformInterceptor());

    // Request ID middleware
    app.use(new RequestIdMiddleware().use);

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('Bite Back API')
        .setDescription('Mobile Food Ordering Application API')
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth',
        )
        .addTag('Auth', 'Authentication endpoints')
        .addTag('Users', 'User management endpoints')
        .addTag('Restaurants', 'Restaurant browsing endpoints')
        .addTag('Menu', 'Menu and items endpoints')
        .addTag('Cart', 'Shopping cart endpoints')
        .addTag('Orders', 'Order management endpoints')
        .addTag('Payments', 'Payment methods endpoints')
        .addTag('Locations', 'Saved locations endpoints')
        .addTag('Search', 'Search endpoints')
        .addTag('Offers', 'Promotions and offers endpoints')
        .addTag('Settings', 'User settings endpoints')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
