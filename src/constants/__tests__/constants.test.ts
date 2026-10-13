import { ApiError, CANCELED, NETWORK_ERROR } from '../../api/errors';
import { analysisErrorInfo, apiErrorMessage } from '../errors';
import { indicatorInfo, KNOWN_INDICATOR_CODES } from '../indicators';
import { RISK_LEVELS } from '../risk';

describe('indicatorInfo', () => {
  it('có đủ 15 dấu hiệu, mỗi dấu hiệu có tên và câu giải thích', () => {
    expect(KNOWN_INDICATOR_CODES).toHaveLength(15);
    for (const code of KNOWN_INDICATOR_CODES) {
      const info = indicatorInfo(code);
      expect(info.label).not.toBe(code);
      expect(info.description).toBeTruthy();
    }
  });

  it('ánh xạ đúng một số mã', () => {
    expect(indicatorInfo('OTP_REQUEST').label).toBe('Đòi mã OTP');
    expect(indicatorInfo('LEGAL_THREAT')).toEqual({
      code: 'LEGAL_THREAT',
      label: 'Đe dọa pháp lý',
      description: 'Người gọi dọa bắt giữ, khởi tố hoặc nói bạn liên quan vụ án.',
    });
  });

  it('mã lạ: hiện nguyên mã, không lỗi', () => {
    expect(indicatorInfo('BRAND_NEW_CODE')).toEqual({
      code: 'BRAND_NEW_CODE',
      label: 'BRAND_NEW_CODE',
      description: null,
    });
  });

  it('mã trùng tên thuộc tính có sẵn của Object vẫn được coi là mã lạ', () => {
    expect(indicatorInfo('constructor').label).toBe('constructor');
    expect(indicatorInfo('toString').description).toBeNull();
  });
});

describe('analysisErrorInfo', () => {
  it.each([
    ['NO_SPEECH_DETECTED', 'Không nghe được lời nói nào trong ghi âm.', false],
    ['INVALID_AUDIO', 'File ghi âm không đọc được. Hãy thử file khác.', false],
    ['EMPTY_AUDIO', 'File ghi âm không đọc được. Hãy thử file khác.', false],
    ['AUDIO_TOO_LONG', 'Ghi âm quá dài hoặc quá lớn.', false],
    ['CALL_HAS_NO_AUDIO', 'Không còn file ghi âm của cuộc gọi này.', false],
    ['AUDIO_OBJECT_MISSING', 'Không còn file ghi âm của cuộc gọi này.', false],
    ['STT_FAILED', 'Hệ thống phân tích đang bận hoặc tạm ngừng. Hãy thử lại sau ít phút.', true],
    ['AI_SERVICE_TIMEOUT', 'Hệ thống phân tích đang bận hoặc tạm ngừng. Hãy thử lại sau ít phút.', true],
    ['ANALYSIS_QUEUE_FULL', 'Đang có quá nhiều cuộc gọi chờ phân tích. Hãy thử lại sau.', true],
    ['ANALYSIS_INTERRUPTED', 'Quá trình phân tích bị gián đoạn. Hãy thử lại.', true],
  ])('%s', (code, message, retryable) => {
    expect(analysisErrorInfo(code)).toEqual({ message, retryable });
  });

  it('mã lạ hoặc null: câu chung, cho thử lại', () => {
    const expected = { message: 'Không phân tích được cuộc gọi này.', retryable: true };
    expect(analysisErrorInfo('SOMETHING_NEW')).toEqual(expected);
    expect(analysisErrorInfo(null)).toEqual(expected);
    expect(analysisErrorInfo('constructor')).toEqual(expected);
  });
});

describe('apiErrorMessage', () => {
  it('ánh xạ mã chung sang tiếng Việt', () => {
    expect(apiErrorMessage(new ApiError({ code: 'PAYLOAD_TOO_LARGE', status: 413 }))).toBe(
      'File lớn hơn 50 MB.',
    );
    expect(apiErrorMessage(new ApiError({ code: 'INVALID_PHONE_NUMBER', status: 400 }))).toBe(
      'Số điện thoại không hợp lệ.',
    );
    expect(apiErrorMessage(new ApiError({ code: NETWORK_ERROR }))).toBe(
      'Không kết nối được máy chủ. Hãy kiểm tra mạng.',
    );
    expect(apiErrorMessage(new ApiError({ code: CANCELED }))).toBe('Đã hủy.');
  });

  it('INTERNAL_ERROR và mã lạ: câu chung kèm mã tra cứu', () => {
    expect(
      apiErrorMessage(new ApiError({ code: 'INTERNAL_ERROR', status: 500, requestId: 'req-123' })),
    ).toBe('Hệ thống gặp lỗi. Hãy thử lại. Mã tra cứu: req-123');
    expect(apiErrorMessage(new ApiError({ code: 'WHO_KNOWS', status: 418, requestId: 'req-9' }))).toBe(
      'Hệ thống gặp lỗi. Hãy thử lại. Mã tra cứu: req-9',
    );
    expect(apiErrorMessage(new ApiError({ code: 'INTERNAL_ERROR', status: 500 }))).toBe(
      'Hệ thống gặp lỗi. Hãy thử lại.',
    );
  });

  it('không bao giờ hiện message tiếng Anh của backend', () => {
    const error = new ApiError({ code: 'WHO_KNOWS', status: 400, message: 'Request validation failed.' });
    expect(apiErrorMessage(error)).not.toContain('Request validation failed.');
  });

  it('câu riêng của màn hình được ưu tiên', () => {
    const error = new ApiError({ code: 'INVALID_CREDENTIALS', status: 401 });
    expect(apiErrorMessage(error, { INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng' })).toBe(
      'Email hoặc mật khẩu không đúng',
    );
  });
});

describe('RISK_LEVELS', () => {
  it('ba mức có nhãn, biểu tượng và lời khuyên đúng như thiết kế', () => {
    expect(RISK_LEVELS.HIGH.label).toBe('Nguy cơ cao');
    expect(RISK_LEVELS.MEDIUM.label).toBe('Đáng ngờ');
    expect(RISK_LEVELS.LOW.label).toBe('Chưa thấy dấu hiệu');
    for (const level of ['HIGH', 'MEDIUM', 'LOW'] as const) {
      expect(RISK_LEVELS[level].icon).toBeTruthy();
      expect(RISK_LEVELS[level].advice.length).toBeGreaterThan(20);
    }
  });
});
