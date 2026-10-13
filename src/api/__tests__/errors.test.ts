import { AxiosError, AxiosHeaders, CanceledError, type AxiosResponse } from 'axios';

import { ApiError, CANCELED, fieldErrorMap, NETWORK_ERROR, toApiError, UNKNOWN_ERROR } from '../errors';

function httpError(status: number, data: unknown, headers: Record<string, string> = {}): AxiosError {
  const response = {
    status,
    statusText: '',
    data,
    headers,
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', response.config, null, response);
}

describe('toApiError', () => {
  it('đọc code, status, requestId và fieldErrors từ lỗi của backend', () => {
    const error = toApiError(
      httpError(400, {
        timestamp: '2026-10-10T06:15:30.123Z',
        status: 400,
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed.',
        path: '/api/v1/auth/register',
        requestId: '3f2c9a1e',
        fieldErrors: [{ field: 'password', message: 'size must be between 8 and 72' }],
      }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.status).toBe(400);
    expect(error.requestId).toBe('3f2c9a1e');
    expect(error.fieldErrors).toEqual([{ field: 'password', message: 'size must be between 8 and 72' }]);
  });

  it('lấy requestId từ header X-Request-Id khi body không có', () => {
    const error = toApiError(httpError(500, { code: 'INTERNAL_ERROR' }, { 'x-request-id': 'hdr-1' }));
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.requestId).toBe('hdr-1');
  });

  it('body không phải JSON lỗi (ví dụ trang HTML của proxy): mã không rõ, giữ status', () => {
    const error = toApiError(httpError(502, '<html>Bad Gateway</html>'));
    expect(error.code).toBe(UNKNOWN_ERROR);
    expect(error.status).toBe(502);
    expect(error.fieldErrors).toEqual([]);
  });

  it('không có response (mất mạng, hết thời gian chờ): NETWORK_ERROR', () => {
    const offline = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(offline.code).toBe(NETWORK_ERROR);
    expect(offline.isNetworkError).toBe(true);
    expect(offline.status).toBeNull();

    expect(toApiError(new AxiosError('timeout', 'ECONNABORTED')).code).toBe(NETWORK_ERROR);
  });

  it('request bị hủy: CANCELED, không tính là lỗi mạng', () => {
    const error = toApiError(new CanceledError('canceled'));
    expect(error.code).toBe(CANCELED);
    expect(error.isNetworkError).toBe(false);
  });

  it('lỗi lạ và ApiError có sẵn', () => {
    expect(toApiError(new Error('boom')).code).toBe(UNKNOWN_ERROR);
    expect(toApiError('chuỗi').code).toBe(UNKNOWN_ERROR);
    const existing = new ApiError({ code: 'CALL_NOT_FOUND', status: 404 });
    expect(toApiError(existing)).toBe(existing);
  });
});

describe('fieldErrorMap', () => {
  it('gom theo tên trường, giữ lỗi đầu tiên của mỗi trường', () => {
    const error = new ApiError({
      code: 'VALIDATION_FAILED',
      status: 400,
      fieldErrors: [
        { field: 'email', message: 'must be a well-formed email address' },
        { field: 'password', message: 'size must be between 8 and 72' },
        { field: 'email', message: 'must not be blank' },
      ],
    });
    expect(fieldErrorMap(error)).toEqual({
      email: 'must be a well-formed email address',
      password: 'size must be between 8 and 72',
    });
  });

  it('không có fieldErrors thì trả object rỗng', () => {
    expect(fieldErrorMap(new ApiError({ code: 'INTERNAL_ERROR' }))).toEqual({});
  });
});
