import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortBy {
    RATING = 'rating',
    DELIVERY_TIME = 'deliveryTime',
    DELIVERY_FEE = 'deliveryFee',
}

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export class ListRestaurantsDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(50)
    limit?: number = 10;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ description: 'Minimum rating filter' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(5)
    rating?: number;

    @ApiPropertyOptional({ description: 'Maximum delivery fee' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxDeliveryFee?: number;

    @ApiPropertyOptional({ description: 'Your order amount (filter by minOrder)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minOrder?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: SortBy, default: SortBy.RATING })
    @IsOptional()
    @IsEnum(SortBy)
    sortBy?: SortBy = SortBy.RATING;

    @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;
}
