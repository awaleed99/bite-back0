import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth Flow (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api');
        app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    const testUser = {
        fullName: 'E2E Test User',
        email: `e2e-${Date.now()}@test.com`,
        password: 'TestPass123!',
        phone: `+20100${Date.now().toString().slice(-7)}`,
    };

    let accessToken: string;
    let refreshToken: string;

    it('/api/v1/auth/signup (POST) - should create user', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/v1/auth/signup')
            .send(testUser)
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(testUser.email.toLowerCase());
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();

        accessToken = response.body.data.accessToken;
        refreshToken = response.body.data.refreshToken;
    });

    it('/api/v1/auth/login (POST) - should login user', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({
                emailOrPhone: testUser.email,
                password: testUser.password,
            })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
    });

    it('/api/v1/auth/refresh (POST) - should refresh tokens', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/v1/auth/refresh')
            .send({ refreshToken })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
    });

    it('/api/v1/profile (GET) - should get profile', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/v1/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe(testUser.email.toLowerCase());
    });

    it('/api/v1/restaurants (GET) - should list restaurants', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/v1/restaurants')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toBeDefined();
        expect(response.body.data.pagination).toBeDefined();
    });
});
