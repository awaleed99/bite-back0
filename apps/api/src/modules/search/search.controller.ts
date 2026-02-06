import { Controller, Get, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Search')
@Controller({ path: 'search', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get()
    @ApiOperation({ summary: 'Search restaurants and menu items' })
    @ApiResponse({ status: 200, description: 'Search results' })
    async search(
        @CurrentUser() user: CurrentUserData,
        @Query() query: SearchDto,
    ) {
        return this.searchService.search(user.id, query);
    }

    @Get('recent')
    @ApiOperation({ summary: 'Get recent searches' })
    @ApiResponse({ status: 200, description: 'Recent searches retrieved' })
    async getRecentSearches(@CurrentUser() user: CurrentUserData) {
        return this.searchService.getRecentSearches(user.id);
    }

    @Delete('recent')
    @ApiOperation({ summary: 'Clear recent searches' })
    @ApiResponse({ status: 200, description: 'Search history cleared' })
    async clearRecentSearches(@CurrentUser() user: CurrentUserData) {
        return this.searchService.clearRecentSearches(user.id);
    }
}
