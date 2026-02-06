import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateLocationDto {
    @ApiProperty({ example: 'Home' })
    @IsString()
    @IsNotEmpty()
    label: string;

    @ApiProperty({ example: '123 Main Street, Cairo' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiPropertyOptional({ example: 'Apt 4B' })
    @IsOptional()
    @IsString()
    apartment?: string;

    @ApiPropertyOptional({ example: '3rd Floor' })
    @IsOptional()
    @IsString()
    floor?: string;

    @ApiPropertyOptional({ example: 'Building A' })
    @IsOptional()
    @IsString()
    building?: string;

    @ApiPropertyOptional({ example: 'Near the mosque' })
    @IsOptional()
    @IsString()
    landmark?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    longitude?: number;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) { }
