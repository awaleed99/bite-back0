import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta: {
        timestamp: string;
        path: string;
        requestId?: string;
    };
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        const request = context.switchToHttp().getRequest<Request>();
        const requestId = request.headers['x-request-id'] as string | undefined;

        return next.handle().pipe(
            map((data) => ({
                success: true,
                data,
                meta: {
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    ...(requestId && { requestId }),
                },
            })),
        );
    }
}
