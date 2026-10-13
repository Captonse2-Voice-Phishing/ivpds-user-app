import { isValidRegisterPhone, normalizePhoneForRegister } from '../phone';

describe('normalizePhoneForRegister', () => {
  it.each([
    ['090 123 4567', '0901234567'],
    ['090.123.4567', '0901234567'],
    ['090-123-4567', '0901234567'],
    ['+84 90 123-45.67', '+84901234567'],
    ['  0901234567  ', '0901234567'],
    ['', ''],
  ])('%p → %p', (input, expected) => {
    expect(normalizePhoneForRegister(input)).toBe(expected);
  });

  it('không tự bỏ ký tự khác, để việc kiểm tra báo lỗi', () => {
    expect(normalizePhoneForRegister('(090) 1234567')).toBe('(090)1234567');
  });
});

describe('isValidRegisterPhone', () => {
  it('chấp nhận 6–15 chữ số, có thể có + ở đầu', () => {
    expect(isValidRegisterPhone('0901234567')).toBe(true);
    expect(isValidRegisterPhone('+84901234567')).toBe(true);
    expect(isValidRegisterPhone('123456')).toBe(true);
  });

  it('từ chối số quá ngắn, quá dài hoặc có ký tự lạ', () => {
    expect(isValidRegisterPhone('12345')).toBe(false);
    expect(isValidRegisterPhone('1234567890123456')).toBe(false);
    expect(isValidRegisterPhone('090 123 4567')).toBe(false);
    expect(isValidRegisterPhone('(090)1234567')).toBe(false);
    expect(isValidRegisterPhone('84+901234567')).toBe(false);
    expect(isValidRegisterPhone('')).toBe(false);
  });
});
