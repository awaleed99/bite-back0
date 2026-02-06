import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Locations')
@Controller({ path: 'locations', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    @Post()
    @ApiOperation({ summary: 'Add a new saved location' })
    @ApiResponse({ status: 201, description: 'Location created' })
    async create(
        @CurrentUser() user: CurrentUserData,
        @Body() dto: CreateLocationDto,
    ) {
        return this.locationsService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all saved locations' })
    @ApiResponse({ status: 200, description: 'Locations retrieved' })
    async findAll(@CurrentUser() user: CurrentUserData) {
        return this.locationsService.findAll(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get location details' })
    @ApiResponse({ status: 200, description: 'Location retrieved' })
    async findOne(
        @CurrentUser() user: CurrentUserData,
        @Param('id') id: string,
    ) {
        return this.locationsService.findOne(user.id, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a saved location' })
    @ApiResponse({ status: 200, description: 'Location updated' })
    async update(
        @CurrentUser() user: CurrentUserData,
        @Param('id') id: string,
        @Body() dto: UpdateLocationDto,
    ) {
        return this.locationsService.update(user.id, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a saved location' })
    @ApiResponse({ status: 200, description: 'Location deleted' })
    async remove(
        @CurrentUser() user: CurrentUserData,
        @Param('id') id: string,
    ) {
        return this.locationsService.remove(user.id, id);
    }

    @Patch(':id/default')
    @ApiOperation({ summary: 'Set location as default' })
    @ApiResponse({ status: 200, description: 'Default location updated' })
    async setDefault(
        @CurrentUser() user: CurrentUserData,
        @Param('id') id: string,
    ) {
        return this.locationsService.setDefault(user.id, id);
    }
}
