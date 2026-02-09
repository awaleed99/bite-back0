import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
    @Get('health')
    @ApiOperation({ summary: 'Health check endpoint' })
    @ApiResponse({ status: 200, description: 'Service is healthy' })
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    }

    @Get()
    @ApiOperation({ summary: 'API root - redirects info' })
    @ApiResponse({ status: 200, description: 'API information' })
    root() {
        return {
            name: 'Bite Back API',
            version: '1.0.0',
            docs: '/api/docs',
            health: '/api/health',
        };
    }
}
