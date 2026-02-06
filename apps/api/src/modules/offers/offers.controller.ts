import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Offers')
@Controller({ path: 'offers', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OffersController {
    constructor(private readonly offersService: OffersService) { }

    @Get()
    @ApiOperation({ summary: 'Get all active offers/promotions' })
    @ApiResponse({ status: 200, description: 'Offers retrieved' })
    async findAll() {
        return this.offersService.findAll();
    }

    @Get('code/:code')
    @ApiOperation({ summary: 'Validate promotion code' })
    @ApiResponse({ status: 200, description: 'Promotion details' })
    async findByCode(@Param('code') code: string) {
        return this.offersService.findByCode(code);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get offer details' })
    @ApiResponse({ status: 200, description: 'Offer details' })
    async findOne(@Param('id') id: string) {
        return this.offersService.findOne(id);
    }
}
