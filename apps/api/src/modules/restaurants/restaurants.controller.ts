import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { ListRestaurantsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Restaurants')
@Controller({ path: 'restaurants', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RestaurantsController {
    constructor(private readonly restaurantsService: RestaurantsService) { }

    @Get()
    @ApiOperation({ summary: 'List all restaurants with filtering and pagination' })
    @ApiResponse({ status: 200, description: 'Restaurants retrieved successfully' })
    async findAll(@Query() query: ListRestaurantsDto) {
        return this.restaurantsService.findAll(query);
    }

    @Get('categories')
    @ApiOperation({ summary: 'Get all restaurant categories' })
    @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
    async getCategories() {
        return this.restaurantsService.getCategories();
    }

    @Get('recommended')
    @ApiOperation({ summary: 'Get recommended restaurants' })
    @ApiResponse({ status: 200, description: 'Recommended restaurants retrieved' })
    async getRecommended(@Query('limit') limit?: number) {
        return this.restaurantsService.getRecommended(limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get restaurant details by ID' })
    @ApiResponse({ status: 200, description: 'Restaurant retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Restaurant not found' })
    async findOne(@Param('id') id: string) {
        return this.restaurantsService.findOne(id);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get restaurant details by slug' })
    @ApiResponse({ status: 200, description: 'Restaurant retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Restaurant not found' })
    async findBySlug(@Param('slug') slug: string) {
        return this.restaurantsService.findBySlug(slug);
    }
}
