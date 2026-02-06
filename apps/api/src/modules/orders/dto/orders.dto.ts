import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNumber,
    IsOptional,
    IsEnum,
    IsNotEmpty,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class CheckoutDto {
    @ApiProperty({ description: 'Payment method ID' })
    @IsString()
    @IsNotEmpty()
    paymentMethodId: string;

    @ApiProperty({ description: 'Delivery location ID' })
    @IsString()
    @IsNotEmpty()
    deliveryLocationId: string;

    @ApiPropertyOptional({ description: 'Special delivery instructions' })
    @IsOptional()
    @IsString()
    deliveryInstructions?: string;
}

export class ListOrdersDto {
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

    @ApiPropertyOptional({ enum: OrderStatus })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;
}

export class UpdateOrderStatusDto {
    @ApiProperty({ enum: OrderStatus })
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @ApiPropertyOptional({ description: 'Reason for cancellation' })
    @IsOptional()
    @IsString()
    reason?: string;
}
