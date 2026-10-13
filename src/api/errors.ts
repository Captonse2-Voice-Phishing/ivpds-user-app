import { isAxiosError, isCancel } from 'axios';

import type { ApiErrorBody, FieldError } from './types';

// Mã do ứng dụng tự đặt cho lỗi không đến từ backend.
export const NETWORK_ERROR = 'NETWORK_ERROR';
export const CANCELED = 'CANCELED';
export const UNKNOWN_ERROR = 'UNKNOWN_ERROR';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly requestId: string | null;
  readonly fieldErrors: FieldError[];

  constructor(params: {
    code: string;
    status?: number | null;
    requestId?: string | null;
    fieldErrors?: FieldError[];
    message?: string;
  }) {
    super(params.message ?? params.code);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status ?? null;
    this.requestId = params.requestId ?? null;
    this.fieldErrors = params.fieldErrors ?? [];
  }

  get isNetworkError(): boolean {
    return this.code === NETWORK_ERROR;
  }
}

function isErrorBody(data: unknown): data is Partial<ApiErrorBody> {
  return typeof data === 'object' && data !== null;
}

function headerValue(headers: unknown, name: string): string | null {
  if (typeof headers !== 'object' || headers === null) return null;
  const value = (headers as Record<string, unknown>)[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

// Đưa mọi lỗi (axios, mạng, bị hủy, lỗi lạ) về một dạng duy nhất để giao diện xử lý theo `code`.
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isCancel(error)) return new ApiError({ code: CANCELED });

  if (isAxiosError(error)) {
    const response = error.response;
    if (!response) return new ApiError({ code: NETWORK_ERROR });

    const body = isErrorBody(response.data) ? response.data : {};
    const requestId =
      (typeof body.requestId === 'string' ? body.requestId : null) ??
      headerValue(response.headers, 'x-request-id');
    return new ApiError({
      code: typeof body.code === 'string' && body.code ? body.code : UNKNOWN_ERROR,
      status: response.status,
      requestId,
      fieldErrors: Array.isArray(body.fieldErrors) ? body.fieldErrors : [],
      message: typeof body.message === 'string' ? body.message : undefined,
    });
  }

  return new ApiError({ code: UNKNOWN_ERROR });
}

// Gom fieldErrors thành { tênTrường: thông báo }; trường lặp thì giữ lỗi đầu tiên.
export function fieldErrorMap(error: ApiError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of error.fieldErrors) {
    if (!(item.field in map)) map[item.field] = item.message;
  }
  return map;
}
