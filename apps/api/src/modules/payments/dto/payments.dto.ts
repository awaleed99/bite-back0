import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsNotEmpty, Min, Max, Matches } from 'class-validator';
import { PaymentMethodType } from '@prisma/client';

export class AddPaymentMethodDto {
    @ApiProperty({ enum: PaymentMethodType })
    @IsEnum(PaymentMethodType)
    type: PaymentMethodType;

    @ApiProperty({ example: '4111111111111111', description: 'Card number (will be tokenized, not stored)' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{13,19}$/, { message: 'Invalid card number' })
    cardNumber: string;

    @ApiProperty({ example: 12 })
    @IsNumber()
    @Min(1)
    @Max(12)
    expiryMonth: number;

    @ApiProperty({ example: 2025 })
    @IsNumber()
    @Min(2024)
    @Max(2040)
    expiryYear: number;

    @ApiProperty({ example: '123', description: 'CVV (will not be stored)' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{3,4}$/, { message: 'Invalid CVV' })
    cvv: string;
}

export * from './payments.dto';
