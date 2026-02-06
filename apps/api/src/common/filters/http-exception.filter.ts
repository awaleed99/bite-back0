import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
    meta: {
        timestamp: string;
        path: string;
        requestId?: string;
    };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let code = 'INTERNAL_ERROR';
        let details: any = undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const responseObj = exceptionResponse as any;
                message = responseObj.message || message;
                code = responseObj.error || this.getErrorCode(status);
                details = responseObj.details || undefined;

                // Handle validation errors
                if (Array.isArray(responseObj.message)) {
                    message = 'Validation failed';
                    details = responseObj.message;
                    code = 'VALIDATION_ERROR';
                }
            }
        } else if (exception instanceof Error) {
            message = exception.message;
            this.logger.error(
                `Unhandled exception: ${exception.message}`,
                exception.stack,
            );
        }

        const errorResponse: ErrorResponse = {
            success: false,
            error: {
                code,
                message,
                ...(details && { details }),
            },
            meta: {
                timestamp: new Date().toISOString(),
                path: request.url,
                ...(request.headers['x-request-id'] && {
                    requestId: request.headers['x-request-id'] as string,
                }),
            },
        };

        response.status(status).json(errorResponse);
    }

    private getErrorCode(status: HttpStatus): string {
        const codes: Record<number, string> = {
            [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
            [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
            [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
            [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
            [HttpStatus.CONFLICT]: 'CONFLICT',
            [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
            [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
            [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
        };
        return codes[status] || 'UNKNOWN_ERROR';
    }
}
