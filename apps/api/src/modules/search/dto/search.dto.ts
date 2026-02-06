import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    query: string;

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
}
