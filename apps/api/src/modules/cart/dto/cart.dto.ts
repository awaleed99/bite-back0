import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNumber,
    IsOptional,
    IsArray,
    ValidateNested,
    Min,
    IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartAddOnDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    addOnOptionId: string;

    @ApiProperty({ default: 1 })
    @IsNumber()
    @Min(1)
    quantity: number = 1;
}

export class AddToCartDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    menuItemId: string;

    @ApiProperty({ default: 1 })
    @IsNumber()
    @Min(1)
    quantity: number = 1;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    specialInstructions?: string;

    @ApiPropertyOptional({ type: [CartAddOnDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CartAddOnDto)
    addOns?: CartAddOnDto[];
}

export class UpdateCartItemDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(1)
    quantity?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    specialInstructions?: string;
}
