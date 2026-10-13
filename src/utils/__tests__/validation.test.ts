import { ApiError } from '../../api/errors';
import { FIELD_MESSAGES, serverFieldErrors } from '../../constants/fieldMessages';
import {
  validateEmail,
  validateFullName,
  validateNewPassword,
  validateOptionalRegisterPhone,
  validatePasswordConfirm,
  validateResetCode,
} from '../validation';

describe('validateEmail', () => {
  it('chấp nhận email hợp lệ, bỏ khoảng trắng hai đầu', () => {
    expect(validateEmail('an@example.com')).toBeNull();
    expect(validateEmail('  an.nguyen+test@mail.example.vn ')).toBeNull();
  });

  it('báo lỗi khi trống hoặc sai dạng', () => {
    expect(validateEmail('')).toBe(FIELD_MESSAGES.emailRequired);
    expect(validateEmail('   ')).toBe(FIELD_MESSAGES.emailRequired);
    for (const bad of ['khong-phai-email', 'a@b', '@example.com', 'a b@example.com', 'a@@example.com']) {
      expect(validateEmail(bad)).toBe(FIELD_MESSAGES.emailInvalid);
    }
    expect(validateEmail(`${'a'.repeat(250)}@example.com`)).toBe(FIELD_MESSAGES.emailInvalid);
  });
});

describe('validateNewPassword', () => {
  it('8–72 ký tự', () => {
    expect(validateNewPassword('12345678')).toBeNull();
    expect(validateNewPassword('a'.repeat(72))).toBeNull();
    expect(validateNewPassword('')).toBe(FIELD_MESSAGES.passwordRequired);
    expect(validateNewPassword('1234567')).toBe(FIELD_MESSAGES.passwordLength);
    expect(validateNewPassword('a'.repeat(73))).toBe(FIELD_MESSAGES.passwordLength);
  });

  it('không cắt khoảng trắng của mật khẩu', () => {
    expect(validateNewPassword('  1234  ')).toBeNull();
  });

  it('nhập lại phải khớp', () => {
    expect(validatePasswordConfirm('MatKhau123', 'MatKhau123')).toBeNull();
    expect(validatePasswordConfirm('MatKhau123', 'matkhau123')).toBe(FIELD_MESSAGES.passwordMismatch);
  });
});

describe('validateFullName', () => {
  it('bắt buộc, tối đa 100 ký tự', () => {
    expect(validateFullName('Nguyễn Văn An')).toBeNull();
    expect(validateFullName('a'.repeat(100))).toBeNull();
    expect(validateFullName('   ')).toBe(FIELD_MESSAGES.fullNameRequired);
    expect(validateFullName('a'.repeat(101))).toBe(FIELD_MESSAGES.fullNameTooLong);
  });
});

describe('validateOptionalRegisterPhone', () => {
  it('bỏ trống thì không gửi số', () => {
    expect(validateOptionalRegisterPhone('')).toEqual({ phoneNumber: undefined, error: null });
    expect(validateOptionalRegisterPhone('  ')).toEqual({ phoneNumber: undefined, error: null });
  });

  it('chuẩn hóa trước khi gửi', () => {
    expect(validateOptionalRegisterPhone('090 123-45.67')).toEqual({
      phoneNumber: '0901234567',
      error: null,
    });
    expect(validateOptionalRegisterPhone('+84 901 234 567').phoneNumber).toBe('+84901234567');
  });

  it('sai dạng thì báo lỗi và không gửi', () => {
    expect(validateOptionalRegisterPhone('abc')).toEqual({
      phoneNumber: undefined,
      error: FIELD_MESSAGES.phoneInvalid,
    });
    expect(validateOptionalRegisterPhone('12345').error).toBe(FIELD_MESSAGES.phoneInvalid);
  });
});

describe('validateResetCode', () => {
  it('đúng 6 chữ số', () => {
    expect(validateResetCode('012345')).toBeNull();
    for (const bad of ['', '12345', '1234567', '12a456', '12 456']) {
      expect(validateResetCode(bad)).toBe(FIELD_MESSAGES.codeInvalid);
    }
  });
});

describe('serverFieldErrors', () => {
  // Đúng dạng backend thật trả về cho POST /auth/register với dữ liệu sai.
  const error = new ApiError({
    code: 'VALIDATION_FAILED',
    status: 400,
    fieldErrors: [
      { field: 'fullName', message: 'must not be blank' },
      { field: 'phoneNumber', message: 'must contain 6 to 15 digits, optionally starting with +' },
      { field: 'password', message: 'size must be between 8 and 72' },
      { field: 'email', message: 'must be a well-formed email address' },
    ],
  });

  it('đổi lỗi từng trường sang tiếng Việt, không lộ câu tiếng Anh', () => {
    const mapped = serverFieldErrors(error);
    expect(mapped).toEqual({
      fullName: 'Họ tên không hợp lệ (1–100 ký tự)',
      phoneNumber: FIELD_MESSAGES.phoneInvalid,
      password: FIELD_MESSAGES.passwordLength,
      email: FIELD_MESSAGES.emailInvalid,
    });
    expect(Object.values(mapped).join(' ')).not.toMatch(/must|size|well-formed/);
  });

  it('trường lạ nhận câu chung; màn hình có thể đặt câu riêng', () => {
    const odd = new ApiError({
      code: 'VALIDATION_FAILED',
      status: 400,
      fieldErrors: [
        { field: 'somethingNew', message: 'is weird' },
        { field: 'password', message: 'must not be blank' },
      ],
    });
    expect(serverFieldErrors(odd, { password: FIELD_MESSAGES.passwordRequired })).toEqual({
      somethingNew: FIELD_MESSAGES.generic,
      password: FIELD_MESSAGES.passwordRequired,
    });
  });
});
